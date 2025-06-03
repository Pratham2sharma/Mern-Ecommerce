import Product from "../models/product.model.js"
import { client } from "../lib/redis.js";
import cloudinary from "../lib/cloudinary.js";

export const getAllProducts = async(req,res) => {
    try{
          const products = await Product.find({});
          res.json({products});
    }
    catch(error){
         console.log("Error in getAllProducts Controller", error.message);
         res.status(500).json({ message: "Server Error" , error: error.message });
    }
}


export const getFeaturedProducts = async(req,res) => {
    try{
      let featuredProducts =  await client.get("featured_products");
      if(featuredProducts) {
        return res.json(JSON.parse(featuredProducts));
      }

      //if not is client redis , fetch  from mongoDB
      featuredProducts = await Product.find({isFeatured: true}).lean();

      if(!featuredProducts){
        return res.status(404).json({message: "No Featured Products Find"});
      }

      //store in redis client for quick access
      await client.set("featured_products", JSON.stringify(featuredProducts));

      res.json(featuredProducts);
    }
    catch(error){
        console.log("Error in getFeaturedProducts Controller", error.message);
        res.status(500).json({message: "Server Error", error: error.message});
    }
}


/*******  9d7c208e-5f5b-4b9f-a79b-74134a44b0f5  *******/
export const createProduct = async (req, res) => {
	try {
		const { name, description, price, image, category } = req.body;

		let cloudinaryResponse = null;

		if (image) {
			cloudinaryResponse = await cloudinary.uploader.upload(image, { folder: "products" });
		}

		const product = await Product.create({
			name,
			description,
			price,
			image: cloudinaryResponse?.secure_url ? cloudinaryResponse.secure_url : "",
			category,
		});

		res.status(201).json(product);
	} catch (error) {
		console.log("Error in createProduct controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const deleteProduct = async(req,res) => {
    try{
      const product = await Product.findById(req.params.id);
      
      if(!product){
        return res.status(404).json({message: "Product not Found"});
      }

      if(product.image){
        const publicId = product.image.split("/").pop().split(".")[0];
        try{
           await cloudinary.uploader.destroy(`products/${publicId}`);
           console.log("Deleted Image from Cloudinary");
        }
        catch(error){
           console.log("Error in deleting image from Cloudinary", error);
        }
      }

      await Product.findByIdAndDelete(req.params.id);
      res.json({message: "product Deleted Successfully"});
    }
    catch(error){
      console.log("Error in deleteProduct Controller", error.message);
      res.status(500).json({message: "Server Error", error: error.message});
    }
}

export const getRecommendedProducts = async(req,res) => {
    try {
		const products = await Product.aggregate([
			{
				$sample: { size: 3 },
			},
			{
				$project: {
					_id: 1,
					name: 1,
					description: 1,
					image: 1,
					price: 1,
				},
			},
		]);

		res.json(products);
	} catch (error) {
		console.log("Error in getRecommendedProducts controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
}

export const getProductsByCategory = async(req,res) => {
    const {category} = req.params;
    try{
       const products = await Product.find({category});
       res.json({products});
    }
    catch(error){
        console.log("Error in getRecommendedProducts Controller", error.message);
      res.status(500).json({message: "Server Error", error: error.message});
    }
}

export const toggleFeaturedProduct = async(req,res) => {
    try{
       const product = await Product.findById(req.params.id);
       if(product){
         product.isFeatured = !product.isFeatured;
         const updatedProuduct = await product.save();
         await updateFeaturedProductsCache();
         res.json(updatedProuduct);
       }else{
          res.status(404).json({message: "Product Not Found"});
       }
    }
    catch(error){
     console.log("Error in toggleFeaturedProduct Controller", error.message);
      res.status(500).json({message: "Server Error", error: error.message});
    }
}

async function updateFeaturedProductsCache() {
    try{
        const featuredProducts =  await Product.find({isFeatured: true}).lean();
        await client.set("featured_products" , JSON.stringify(featuredProducts));
    }
    catch(error){
        console.log("Erroor in updateFeaturedProductsCache", error.message);
    }
}
