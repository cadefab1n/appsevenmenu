from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime, time
import os
from dotenv import load_dotenv
import qrcode
import io
import base64

load_dotenv()

app = FastAPI(title="Seven Menu Experience API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
client = MongoClient(os.getenv("MONGO_URL"))
db = client["seven_menu"]

# Collections
restaurants_col = db["restaurants"]
categories_col = db["categories"]
products_col = db["products"]
time_menus_col = db["time_menus"]

# Pydantic Models
class Restaurant(BaseModel):
    name: str
    logo: Optional[str] = None  # base64
    whatsapp: str
    address: Optional[str] = None
    primary_color: str = "#FF6B35"
    secondary_color: str = "#004E89"
    description: Optional[str] = None

class RestaurantUpdate(BaseModel):
    name: Optional[str] = None
    logo: Optional[str] = None
    whatsapp: Optional[str] = None
    address: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    description: Optional[str] = None

class Category(BaseModel):
    name: str
    restaurant_id: str
    order: int = 0
    active: bool = True
    icon: Optional[str] = None

class Product(BaseModel):
    name: str
    description: str
    price: float
    image: Optional[str] = None  # base64
    category_id: str
    restaurant_id: str
    badges: List[str] = []  # ["mais_pedido", "escolha_inteligente", "compartilhar"]
    active: bool = True
    order: int = 0

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    image: Optional[str] = None
    category_id: Optional[str] = None
    badges: Optional[List[str]] = None
    active: Optional[bool] = None
    order: Optional[int] = None

class TimeMenu(BaseModel):
    name: str  # "Almoço", "Happy Hour", "Noite"
    start_time: str  # "11:00"
    end_time: str  # "15:00"
    restaurant_id: str
    product_ids: List[str] = []
    active: bool = True

# Helper function
def serialize_doc(doc):
    if doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc

# Root endpoint
@app.get("/api")
def read_root():
    return {"message": "Seven Menu Experience API", "version": "1.0.0"}

# ============== RESTAURANTS ==============
@app.post("/api/restaurants")
def create_restaurant(restaurant: Restaurant):
    doc = restaurant.dict()
    doc["created_at"] = datetime.utcnow()
    result = restaurants_col.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    return {"success": True, "restaurant": serialize_doc(doc)}

@app.get("/api/restaurants/{restaurant_id}")
def get_restaurant(restaurant_id: str):
    try:
        restaurant = restaurants_col.find_one({"_id": ObjectId(restaurant_id)})
        if not restaurant:
            raise HTTPException(status_code=404, detail="Restaurant not found")
        return {"success": True, "restaurant": serialize_doc(restaurant)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/restaurants")
def list_restaurants():
    restaurants = list(restaurants_col.find())
    return {"success": True, "restaurants": [serialize_doc(r) for r in restaurants]}

@app.put("/api/restaurants/{restaurant_id}")
def update_restaurant(restaurant_id: str, update: RestaurantUpdate):
    try:
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        result = restaurants_col.update_one(
            {"_id": ObjectId(restaurant_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Restaurant not found")
        
        restaurant = restaurants_col.find_one({"_id": ObjectId(restaurant_id)})
        return {"success": True, "restaurant": serialize_doc(restaurant)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============== CATEGORIES ==============
@app.get("/api/restaurants/{restaurant_id}/categories")
def get_categories(restaurant_id: str):
    categories = list(categories_col.find({"restaurant_id": restaurant_id}).sort("order", 1))
    return {"success": True, "categories": [serialize_doc(c) for c in categories]}

@app.post("/api/categories")
def create_category(category: Category):
    doc = category.dict()
    doc["created_at"] = datetime.utcnow()
    result = categories_col.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    return {"success": True, "category": serialize_doc(doc)}

@app.put("/api/categories/{category_id}")
def update_category(category_id: str, category: Category):
    try:
        result = categories_col.update_one(
            {"_id": ObjectId(category_id)},
            {"$set": category.dict()}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Category not found")
        
        updated = categories_col.find_one({"_id": ObjectId(category_id)})
        return {"success": True, "category": serialize_doc(updated)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/categories/{category_id}")
def delete_category(category_id: str):
    try:
        # Check if category has products
        products_count = products_col.count_documents({"category_id": category_id})
        if products_count > 0:
            raise HTTPException(status_code=400, detail="Cannot delete category with products")
        
        result = categories_col.delete_one({"_id": ObjectId(category_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Category not found")
        
        return {"success": True, "message": "Category deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============== PRODUCTS ==============
@app.get("/api/restaurants/{restaurant_id}/products")
def get_products(restaurant_id: str, category_id: Optional[str] = None):
    query = {"restaurant_id": restaurant_id}
    if category_id:
        query["category_id"] = category_id
    
    products = list(products_col.find(query).sort("order", 1))
    return {"success": True, "products": [serialize_doc(p) for p in products]}

@app.post("/api/products")
def create_product(product: Product):
    doc = product.dict()
    doc["created_at"] = datetime.utcnow()
    result = products_col.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    return {"success": True, "product": serialize_doc(doc)}

@app.get("/api/products/{product_id}")
def get_product(product_id: str):
    try:
        product = products_col.find_one({"_id": ObjectId(product_id)})
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return {"success": True, "product": serialize_doc(product)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/api/products/{product_id}")
def update_product(product_id: str, update: ProductUpdate):
    try:
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        result = products_col.update_one(
            {"_id": ObjectId(product_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Product not found")
        
        product = products_col.find_one({"_id": ObjectId(product_id)})
        return {"success": True, "product": serialize_doc(product)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.patch("/api/products/{product_id}/toggle")
def toggle_product(product_id: str):
    try:
        product = products_col.find_one({"_id": ObjectId(product_id)})
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        new_status = not product.get("active", True)
        products_col.update_one(
            {"_id": ObjectId(product_id)},
            {"$set": {"active": new_status}}
        )
        
        return {"success": True, "active": new_status}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/products/{product_id}")
def delete_product(product_id: str):
    try:
        result = products_col.delete_one({"_id": ObjectId(product_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Product not found")
        
        return {"success": True, "message": "Product deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============== TIME MENUS ==============
@app.get("/api/restaurants/{restaurant_id}/time-menus")
def get_time_menus(restaurant_id: str):
    menus = list(time_menus_col.find({"restaurant_id": restaurant_id}))
    return {"success": True, "menus": [serialize_doc(m) for m in menus]}

@app.post("/api/time-menus")
def create_time_menu(menu: TimeMenu):
    doc = menu.dict()
    doc["created_at"] = datetime.utcnow()
    result = time_menus_col.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    return {"success": True, "menu": serialize_doc(doc)}

@app.put("/api/time-menus/{menu_id}")
def update_time_menu(menu_id: str, menu: TimeMenu):
    try:
        result = time_menus_col.update_one(
            {"_id": ObjectId(menu_id)},
            {"$set": menu.dict()}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Time menu not found")
        
        updated = time_menus_col.find_one({"_id": ObjectId(menu_id)})
        return {"success": True, "menu": serialize_doc(updated)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/time-menus/{menu_id}")
def delete_time_menu(menu_id: str):
    try:
        result = time_menus_col.delete_one({"_id": ObjectId(menu_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Time menu not found")
        
        return {"success": True, "message": "Time menu deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============== QR CODE ==============
@app.get("/api/qrcode/{restaurant_id}")
def generate_qr_code(restaurant_id: str):
    try:
        # Verify restaurant exists
        restaurant = restaurants_col.find_one({"_id": ObjectId(restaurant_id)})
        if not restaurant:
            raise HTTPException(status_code=404, detail="Restaurant not found")
        
        # Generate QR code URL (this would be the public menu URL)
        menu_url = f"https://menu.seven.app/{restaurant_id}"
        
        # Generate QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(menu_url)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        qr_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        return {
            "success": True,
            "qr_code": f"data:image/png;base64,{qr_base64}",
            "url": menu_url
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
