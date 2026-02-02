from fastapi import FastAPI, HTTPException, Body, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime, timedelta
import os
import sys
from dotenv import load_dotenv
import qrcode
import io
import base64
import random

load_dotenv()

app = FastAPI(title="Seven Menu API v2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL")
if not MONGO_URL:
    print("ERROR: MONGO_URL not set!")
    sys.exit(1)

try:
    client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
    client.server_info()
    print("✅ MongoDB connected")
except Exception as e:
    print(f"ERROR: MongoDB connection failed: {e}")
    sys.exit(1)

# Use DB_NAME from environment variable for production (Atlas), fallback for local
db = client[os.getenv('DB_NAME', 'seven_menu')]

# Collections
restaurants_col = db["restaurants"]
categories_col = db["categories"]
products_col = db["products"]
orders_col = db["orders"]
analytics_col = db["analytics"]
promotions_col = db["promotions"]
combos_col = db["combos"]

# ============== HELPERS ==============
def serialize_doc(doc):
    if doc:
        doc["id"] = str(doc.pop("_id"))
    return doc

def serialize_list(docs):
    return [serialize_doc(doc) for doc in docs]

# ============== MODELS ==============
class Restaurant(BaseModel):
    name: str
    description: Optional[str] = None
    logo: Optional[str] = None
    address: Optional[str] = None
    whatsapp: Optional[str] = None
    primary_color: Optional[str] = "#E63946"
    secondary_color: Optional[str] = "#1D3557"
    font: Optional[str] = "Inter"
    banner: Optional[str] = None
    opening_hours: Optional[Dict[str, Any]] = None  # {"mon": {"open": "11:00", "close": "22:00"}, ...}
    is_open: Optional[bool] = True
    closed_message: Optional[str] = "Estamos fechados no momento"
    min_order: Optional[float] = 0
    delivery_fee: Optional[float] = 0
    pickup_enabled: Optional[bool] = True
    payment_methods: Optional[List[str]] = ["pix", "dinheiro", "cartao"]
    whatsapp_message: Optional[str] = None
    thank_you_message: Optional[str] = "Obrigado pelo pedido!"

class Category(BaseModel):
    name: str
    restaurant_id: str
    order: Optional[int] = 0
    icon: Optional[str] = None
    image: Optional[str] = None
    active: Optional[bool] = True
    pinned: Optional[bool] = False
    parent_id: Optional[str] = None  # For subcategories
    schedule: Optional[Dict[str, Any]] = None  # {"start": "18:00", "end": "23:00"}

class ProductVariation(BaseModel):
    name: str  # "Tamanho", "Borda", "Adicionais"
    type: str  # "single", "multiple"
    required: Optional[bool] = False
    min_select: Optional[int] = 0
    max_select: Optional[int] = 1
    options: List[Dict[str, Any]]  # [{"name": "Pequena", "price": 0}, {"name": "Grande", "price": 10}]

class Product(BaseModel):
    name: str
    description: Optional[str] = None
    long_description: Optional[str] = None
    price: float
    promo_price: Optional[float] = None
    promo_start: Optional[datetime] = None
    promo_end: Optional[datetime] = None
    image: Optional[str] = None
    gallery: Optional[List[str]] = []
    category_id: str
    restaurant_id: str
    active: Optional[bool] = True
    featured: Optional[str] = None  # "mais_vendido", "recomendado", "novo"
    order: Optional[int] = 0
    sku: Optional[str] = None
    variations: Optional[List[ProductVariation]] = []
    removable_ingredients: Optional[List[str]] = []
    schedule: Optional[Dict[str, Any]] = None
    stock_enabled: Optional[bool] = False
    stock_quantity: Optional[int] = 0

class Combo(BaseModel):
    name: str
    description: Optional[str] = None
    image: Optional[str] = None
    restaurant_id: str
    products: List[Dict[str, Any]]  # [{"product_id": "...", "quantity": 1, "required": True}]
    original_price: float
    combo_price: float
    discount_percent: Optional[float] = None
    active: Optional[bool] = True
    customizable: Optional[bool] = False

class Promotion(BaseModel):
    name: str
    restaurant_id: str
    type: str  # "happy_hour", "flash_sale", "coupon", "link_coupon"
    discount_type: str  # "percent", "fixed"
    discount_value: float
    product_ids: Optional[List[str]] = []
    category_ids: Optional[List[str]] = []
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    start_time: Optional[str] = None  # "18:00"
    end_time: Optional[str] = None  # "20:00"
    coupon_code: Optional[str] = None
    link_slug: Optional[str] = None
    active: Optional[bool] = True
    usage_limit: Optional[int] = None
    usage_count: Optional[int] = 0

class Order(BaseModel):
    restaurant_id: str
    items: List[Dict[str, Any]]
    subtotal: float
    delivery_fee: Optional[float] = 0
    discount: Optional[float] = 0
    total: float
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    payment_method: Optional[str] = None
    order_type: str  # "delivery", "pickup"
    status: Optional[str] = "pending"
    source: Optional[str] = "direct"  # "qrcode", "instagram", "whatsapp", "link"
    promo_code: Optional[str] = None

class AnalyticsEvent(BaseModel):
    restaurant_id: str
    event_type: str  # "page_view", "product_view", "add_to_cart", "checkout_click", "order_sent"
    product_id: Optional[str] = None
    category_id: Optional[str] = None
    source: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

# ============== ROOT ==============
@app.get("/")
def root_redirect():
    """Health check endpoint for Kubernetes"""
    return {"status": "ok", "service": "Seven Menu API"}

@app.get("/api")
def api_root():
    return {"message": "Seven Menu API v2", "version": "2.0.0"}

# ============== RESTAURANTS ==============
@app.get("/api/restaurants")
def get_restaurants():
    restaurants = serialize_list(restaurants_col.find().limit(100))
    return {"success": True, "restaurants": restaurants}

@app.get("/api/restaurants/{restaurant_id}")
def get_restaurant(restaurant_id: str):
    restaurant = restaurants_col.find_one({"_id": ObjectId(restaurant_id)})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return {"success": True, "restaurant": serialize_doc(restaurant)}

@app.post("/api/restaurants")
def create_restaurant(restaurant: Restaurant):
    data = restaurant.dict()
    data["created_at"] = datetime.utcnow()
    result = restaurants_col.insert_one(data)
    data["id"] = str(result.inserted_id)
    return {"success": True, "restaurant": data}

@app.put("/api/restaurants/{restaurant_id}")
def update_restaurant(restaurant_id: str, restaurant: Dict[str, Any] = Body(...)):
    restaurant.pop("id", None)
    restaurant.pop("_id", None)
    restaurant["updated_at"] = datetime.utcnow()
    restaurants_col.update_one({"_id": ObjectId(restaurant_id)}, {"$set": restaurant})
    updated = restaurants_col.find_one({"_id": ObjectId(restaurant_id)})
    return {"success": True, "restaurant": serialize_doc(updated)}

# ============== CATEGORIES ==============
@app.get("/api/restaurants/{restaurant_id}/categories")
def get_categories(restaurant_id: str):
    categories = serialize_list(
        categories_col.find({"restaurant_id": restaurant_id}).sort("order", 1).limit(50)
    )
    return {"success": True, "categories": categories}

@app.post("/api/categories")
def create_category(category: Category):
    data = category.dict()
    data["created_at"] = datetime.utcnow()
    result = categories_col.insert_one(data)
    data.pop("_id", None)  # Remove ObjectId before returning
    data["id"] = str(result.inserted_id)
    return {"success": True, "category": data}

@app.put("/api/categories/{category_id}")
def update_category(category_id: str, category: Dict[str, Any] = Body(...)):
    category.pop("id", None)
    category.pop("_id", None)
    category["updated_at"] = datetime.utcnow()
    categories_col.update_one({"_id": ObjectId(category_id)}, {"$set": category})
    updated = categories_col.find_one({"_id": ObjectId(category_id)})
    return {"success": True, "category": serialize_doc(updated)}

@app.delete("/api/categories/{category_id}")
def delete_category(category_id: str):
    categories_col.delete_one({"_id": ObjectId(category_id)})
    return {"success": True, "message": "Category deleted"}

@app.post("/api/categories/{category_id}/duplicate")
def duplicate_category(category_id: str):
    original = categories_col.find_one({"_id": ObjectId(category_id)})
    if not original:
        raise HTTPException(status_code=404, detail="Category not found")
    original.pop("_id")
    original["name"] = f"{original['name']} (cópia)"
    original["created_at"] = datetime.utcnow()
    result = categories_col.insert_one(original)
    original["id"] = str(result.inserted_id)
    return {"success": True, "category": original}

@app.put("/api/categories/reorder")
def reorder_categories(orders: List[Dict[str, Any]] = Body(...)):
    for item in orders:
        categories_col.update_one(
            {"_id": ObjectId(item["id"])},
            {"$set": {"order": item["order"]}}
        )
    return {"success": True, "message": "Categories reordered"}

# ============== PRODUCTS ==============
@app.get("/api/restaurants/{restaurant_id}/products")
def get_products(restaurant_id: str, category_id: Optional[str] = None):
    query = {"restaurant_id": restaurant_id}
    if category_id:
        query["category_id"] = category_id
    products = serialize_list(products_col.find(query).sort("order", 1).limit(200))
    return {"success": True, "products": products}

@app.get("/api/products/{product_id}")
def get_product(product_id: str):
    product = products_col.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"success": True, "product": serialize_doc(product)}

@app.post("/api/products")
def create_product(product: Product):
    data = product.dict()
    data["created_at"] = datetime.utcnow()
    data["views"] = 0
    data["clicks"] = 0
    data["cart_adds"] = 0
    data["orders"] = 0
    data["revenue"] = 0
    result = products_col.insert_one(data)
    data["id"] = str(result.inserted_id)
    return {"success": True, "product": data}

@app.put("/api/products/{product_id}")
def update_product(product_id: str, product: Dict[str, Any] = Body(...)):
    product.pop("id", None)
    product.pop("_id", None)
    product["updated_at"] = datetime.utcnow()
    products_col.update_one({"_id": ObjectId(product_id)}, {"$set": product})
    updated = products_col.find_one({"_id": ObjectId(product_id)})
    return {"success": True, "product": serialize_doc(updated)}

@app.delete("/api/products/{product_id}")
def delete_product(product_id: str):
    products_col.delete_one({"_id": ObjectId(product_id)})
    return {"success": True, "message": "Product deleted"}

@app.post("/api/products/{product_id}/duplicate")
def duplicate_product(product_id: str):
    original = products_col.find_one({"_id": ObjectId(product_id)})
    if not original:
        raise HTTPException(status_code=404, detail="Product not found")
    original.pop("_id")
    original["name"] = f"{original['name']} (cópia)"
    original["created_at"] = datetime.utcnow()
    original["views"] = 0
    original["clicks"] = 0
    original["cart_adds"] = 0
    original["orders"] = 0
    original["revenue"] = 0
    result = products_col.insert_one(original)
    original["id"] = str(result.inserted_id)
    return {"success": True, "product": original}

@app.patch("/api/products/{product_id}/toggle")
def toggle_product(product_id: str):
    product = products_col.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    new_status = not product.get("active", True)
    products_col.update_one({"_id": ObjectId(product_id)}, {"$set": {"active": new_status}})
    return {"success": True, "active": new_status}

@app.put("/api/products/reorder")
def reorder_products(orders: List[Dict[str, Any]] = Body(...)):
    for item in orders:
        products_col.update_one(
            {"_id": ObjectId(item["id"])},
            {"$set": {"order": item["order"]}}
        )
    return {"success": True, "message": "Products reordered"}

# ============== COMBOS ==============
@app.get("/api/restaurants/{restaurant_id}/combos")
def get_combos(restaurant_id: str):
    combos = serialize_list(combos_col.find({"restaurant_id": restaurant_id}))
    return {"success": True, "combos": combos}

@app.post("/api/combos")
def create_combo(combo: Combo):
    data = combo.dict()
    data["created_at"] = datetime.utcnow()
    data["views"] = 0
    data["clicks"] = 0
    data["orders"] = 0
    data["revenue"] = 0
    if data["original_price"] > 0:
        data["discount_percent"] = round((1 - data["combo_price"] / data["original_price"]) * 100)
    result = combos_col.insert_one(data)
    data["id"] = str(result.inserted_id)
    return {"success": True, "combo": data}

@app.put("/api/combos/{combo_id}")
def update_combo(combo_id: str, combo: Dict[str, Any] = Body(...)):
    combo.pop("id", None)
    combo.pop("_id", None)
    combo["updated_at"] = datetime.utcnow()
    combos_col.update_one({"_id": ObjectId(combo_id)}, {"$set": combo})
    updated = combos_col.find_one({"_id": ObjectId(combo_id)})
    return {"success": True, "combo": serialize_doc(updated)}

@app.delete("/api/combos/{combo_id}")
def delete_combo(combo_id: str):
    combos_col.delete_one({"_id": ObjectId(combo_id)})
    return {"success": True, "message": "Combo deleted"}

# ============== PROMOTIONS ==============
@app.get("/api/restaurants/{restaurant_id}/promotions")
def get_promotions(restaurant_id: str):
    promotions = serialize_list(promotions_col.find({"restaurant_id": restaurant_id}))
    return {"success": True, "promotions": promotions}

@app.post("/api/promotions")
def create_promotion(promotion: Promotion):
    data = promotion.dict()
    data["created_at"] = datetime.utcnow()
    result = promotions_col.insert_one(data)
    data["id"] = str(result.inserted_id)
    return {"success": True, "promotion": data}

@app.put("/api/promotions/{promotion_id}")
def update_promotion(promotion_id: str, promotion: Dict[str, Any] = Body(...)):
    promotion.pop("id", None)
    promotion.pop("_id", None)
    promotion["updated_at"] = datetime.utcnow()
    promotions_col.update_one({"_id": ObjectId(promotion_id)}, {"$set": promotion})
    updated = promotions_col.find_one({"_id": ObjectId(promotion_id)})
    return {"success": True, "promotion": serialize_doc(updated)}

@app.delete("/api/promotions/{promotion_id}")
def delete_promotion(promotion_id: str):
    promotions_col.delete_one({"_id": ObjectId(promotion_id)})
    return {"success": True, "message": "Promotion deleted"}

# ============== ORDERS ==============
@app.get("/api/restaurants/{restaurant_id}/orders")
def get_orders(
    restaurant_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: Optional[str] = None
):
    query = {"restaurant_id": restaurant_id}
    if start_date:
        query["created_at"] = {"$gte": datetime.fromisoformat(start_date)}
    if end_date:
        if "created_at" in query:
            query["created_at"]["$lte"] = datetime.fromisoformat(end_date)
        else:
            query["created_at"] = {"$lte": datetime.fromisoformat(end_date)}
    if status:
        query["status"] = status
    orders = serialize_list(orders_col.find(query).sort("created_at", -1).limit(500))
    return {"success": True, "orders": orders}

@app.post("/api/orders")
def create_order(order: Order):
    data = order.dict()
    data["created_at"] = datetime.utcnow()
    data["order_number"] = f"#{random.randint(1000, 9999)}"
    result = orders_col.insert_one(data)
    data["id"] = str(result.inserted_id)
    
    # Update product stats
    for item in data["items"]:
        if "product_id" in item:
            products_col.update_one(
                {"_id": ObjectId(item["product_id"])},
                {
                    "$inc": {
                        "orders": item.get("quantity", 1),
                        "revenue": item.get("price", 0) * item.get("quantity", 1)
                    }
                }
            )
    
    return {"success": True, "order": data}

@app.put("/api/orders/{order_id}/status")
def update_order_status(order_id: str, status: str = Body(..., embed=True)):
    orders_col.update_one({"_id": ObjectId(order_id)}, {"$set": {"status": status}})
    return {"success": True, "message": "Order status updated"}

# ============== ANALYTICS ==============
@app.post("/api/analytics/event")
def track_event(event: AnalyticsEvent):
    data = event.dict()
    data["created_at"] = datetime.utcnow()
    analytics_col.insert_one(data)
    
    # Update product stats based on event type
    if event.product_id:
        update_field = None
        if event.event_type == "product_view":
            update_field = "views"
        elif event.event_type == "add_to_cart":
            update_field = "cart_adds"
        elif event.event_type == "product_click":
            update_field = "clicks"
        
        if update_field:
            products_col.update_one(
                {"_id": ObjectId(event.product_id)},
                {"$inc": {update_field: 1}}
            )
    
    return {"success": True}

@app.get("/api/restaurants/{restaurant_id}/analytics/dashboard")
def get_dashboard_analytics(restaurant_id: str):
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday = today - timedelta(days=1)
    week_ago = today - timedelta(days=7)
    
    # Today's orders
    today_orders = list(orders_col.find({
        "restaurant_id": restaurant_id,
        "created_at": {"$gte": today}
    }))
    
    # Yesterday's orders
    yesterday_orders = list(orders_col.find({
        "restaurant_id": restaurant_id,
        "created_at": {"$gte": yesterday, "$lt": today}
    }))
    
    # Calculate metrics
    today_count = len(today_orders)
    today_revenue = sum(o.get("total", 0) for o in today_orders)
    today_avg_ticket = today_revenue / today_count if today_count > 0 else 0
    
    yesterday_count = len(yesterday_orders)
    yesterday_revenue = sum(o.get("total", 0) for o in yesterday_orders)
    
    # Growth percentages
    revenue_growth = ((today_revenue - yesterday_revenue) / yesterday_revenue * 100) if yesterday_revenue > 0 else 0
    orders_growth = ((today_count - yesterday_count) / yesterday_count * 100) if yesterday_count > 0 else 0
    
    # Top products
    products = list(products_col.find({"restaurant_id": restaurant_id}).sort("orders", -1).limit(5))
    top_products = [{"name": p["name"], "orders": p.get("orders", 0), "revenue": p.get("revenue", 0)} for p in products]
    
    # Hourly distribution (simulated for now)
    hourly_orders = {}
    for order in today_orders:
        hour = order["created_at"].hour
        hourly_orders[hour] = hourly_orders.get(hour, 0) + 1
    
    peak_hour = max(hourly_orders.keys(), default=12) if hourly_orders else 12
    
    # Analytics events (funnel)
    page_views = analytics_col.count_documents({
        "restaurant_id": restaurant_id,
        "event_type": "page_view",
        "created_at": {"$gte": today}
    })
    
    cart_adds = analytics_col.count_documents({
        "restaurant_id": restaurant_id,
        "event_type": "add_to_cart",
        "created_at": {"$gte": today}
    })
    
    checkout_clicks = analytics_col.count_documents({
        "restaurant_id": restaurant_id,
        "event_type": "checkout_click",
        "created_at": {"$gte": today}
    })
    
    return {
        "success": True,
        "dashboard": {
            "today": {
                "orders": today_count,
                "revenue": round(today_revenue, 2),
                "avg_ticket": round(today_avg_ticket, 2),
                "peak_hour": f"{peak_hour}:00"
            },
            "comparison": {
                "revenue_growth": round(revenue_growth, 1),
                "orders_growth": round(orders_growth, 1)
            },
            "funnel": {
                "page_views": page_views,
                "cart_adds": cart_adds,
                "checkout_clicks": checkout_clicks,
                "orders_sent": today_count
            },
            "top_products": top_products,
            "hourly_distribution": hourly_orders
        }
    }

@app.get("/api/restaurants/{restaurant_id}/analytics/products")
def get_product_analytics(restaurant_id: str):
    products = list(products_col.find({"restaurant_id": restaurant_id}).limit(500))
    
    # Sort by different metrics
    most_viewed = sorted(products, key=lambda x: x.get("views", 0), reverse=True)[:10]
    most_clicked = sorted(products, key=lambda x: x.get("clicks", 0), reverse=True)[:10]
    most_sold = sorted(products, key=lambda x: x.get("orders", 0), reverse=True)[:10]
    most_revenue = sorted(products, key=lambda x: x.get("revenue", 0), reverse=True)[:10]
    most_abandoned = sorted(products, key=lambda x: x.get("cart_adds", 0) - x.get("orders", 0), reverse=True)[:10]
    
    def simplify(p):
        return {
            "id": str(p["_id"]),
            "name": p["name"],
            "views": p.get("views", 0),
            "clicks": p.get("clicks", 0),
            "cart_adds": p.get("cart_adds", 0),
            "orders": p.get("orders", 0),
            "revenue": p.get("revenue", 0),
            "conversion": round(p.get("orders", 0) / p.get("views", 1) * 100, 1) if p.get("views", 0) > 0 else 0
        }
    
    return {
        "success": True,
        "analytics": {
            "most_viewed": [simplify(p) for p in most_viewed],
            "most_clicked": [simplify(p) for p in most_clicked],
            "most_sold": [simplify(p) for p in most_sold],
            "most_revenue": [simplify(p) for p in most_revenue],
            "most_abandoned": [simplify(p) for p in most_abandoned]
        }
    }

@app.get("/api/restaurants/{restaurant_id}/analytics/sources")
def get_source_analytics(restaurant_id: str):
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Group orders by source
    pipeline = [
        {"$match": {"restaurant_id": restaurant_id, "created_at": {"$gte": today - timedelta(days=30)}}},
        {"$group": {
            "_id": "$source",
            "count": {"$sum": 1},
            "revenue": {"$sum": "$total"}
        }}
    ]
    
    results = list(orders_col.aggregate(pipeline))
    
    sources = {}
    for r in results:
        source = r["_id"] or "direct"
        sources[source] = {
            "orders": r["count"],
            "revenue": round(r["revenue"], 2)
        }
    
    return {"success": True, "sources": sources}

@app.get("/api/restaurants/{restaurant_id}/analytics/heatmap")
def get_heatmap_analytics(restaurant_id: str):
    week_ago = datetime.utcnow() - timedelta(days=7)
    
    orders = list(orders_col.find({
        "restaurant_id": restaurant_id,
        "created_at": {"$gte": week_ago}
    }))
    
    # Day of week distribution
    days = {0: "Seg", 1: "Ter", 2: "Qua", 3: "Qui", 4: "Sex", 5: "Sáb", 6: "Dom"}
    day_counts = {d: 0 for d in days.values()}
    hour_counts = {h: 0 for h in range(24)}
    
    for order in orders:
        day_name = days[order["created_at"].weekday()]
        day_counts[day_name] += 1
        hour_counts[order["created_at"].hour] += 1
    
    return {
        "success": True,
        "heatmap": {
            "by_day": day_counts,
            "by_hour": hour_counts,
            "best_day": max(day_counts.keys(), key=lambda k: day_counts[k]) if day_counts else "Seg",
            "best_hour": max(hour_counts.keys(), key=lambda k: hour_counts[k]) if hour_counts else 12
        }
    }

# ============== QR CODE ==============
@app.get("/api/qrcode/{restaurant_id}")
def generate_qrcode(restaurant_id: str, source: str = "qrcode"):
    base_url = os.getenv("FRONTEND_URL")
    if not base_url:
        raise HTTPException(status_code=500, detail="FRONTEND_URL not configured")
    menu_url = f"{base_url}/restaurantesena?source={source}"
    
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(menu_url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    qr_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    return {
        "success": True,
        "qr_code": f"data:image/png;base64,{qr_base64}",
        "url": menu_url
    }

# ============== HEALTH ==============
@app.get("/api/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
