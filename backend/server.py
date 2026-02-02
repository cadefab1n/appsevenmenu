# Seven Menu SaaS - Backend
from fastapi import FastAPI, HTTPException, Depends, Body, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
import os
import sys
from dotenv import load_dotenv
import qrcode
import io
import base64
import random
import re

load_dotenv()

# ============== CONFIG ==============
# Use SQLite for simplicity (can switch to PostgreSQL later)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sevenmenu.db")
SECRET_KEY = os.getenv("SECRET_KEY", "seven-menu-secret-key-2024-super-secure")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

# ============== DATABASE ==============
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ============== MODELS ==============
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255))
    role = Column(String(50), default="owner")  # owner, admin, staff
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    restaurant = relationship("Restaurant", back_populates="users")

class Restaurant(Base):
    __tablename__ = "restaurants"
    
    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    logo = Column(Text)
    banner = Column(Text)
    address = Column(String(500))
    whatsapp = Column(String(20))
    primary_color = Column(String(20), default="#E63946")
    secondary_color = Column(String(20), default="#1D3557")
    font = Column(String(100), default="Inter")
    is_open = Column(Boolean, default=True)
    closed_message = Column(String(500), default="Estamos fechados no momento")
    opening_hours = Column(JSON, default={})
    min_order = Column(Float, default=0)
    delivery_fee = Column(Float, default=0)
    pickup_enabled = Column(Boolean, default=True)
    payment_methods = Column(JSON, default=["pix", "dinheiro", "cartao"])
    whatsapp_message = Column(Text)
    thank_you_message = Column(String(500), default="Obrigado pelo pedido!")
    is_active = Column(Boolean, default=True)
    plan = Column(String(50), default="free")  # free, starter, pro
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    users = relationship("User", back_populates="restaurant")
    categories = relationship("Category", back_populates="restaurant", cascade="all, delete-orphan")
    products = relationship("Product", back_populates="restaurant", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="restaurant", cascade="all, delete-orphan")

class Category(Base):
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    icon = Column(String(100))
    image = Column(Text)
    order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    restaurant = relationship("Restaurant", back_populates="categories")
    products = relationship("Product", back_populates="category")

class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    price = Column(Float, nullable=False)
    promo_price = Column(Float)
    image = Column(Text)
    gallery = Column(JSON, default=[])
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    featured_tag = Column(String(50))  # "mais_vendido", "novo", "recomendado"
    order = Column(Integer, default=0)
    variations = Column(JSON, default=[])
    removable_ingredients = Column(JSON, default=[])
    views = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    cart_adds = Column(Integer, default=0)
    orders_count = Column(Integer, default=0)
    revenue = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    restaurant = relationship("Restaurant", back_populates="products")
    category = relationship("Category", back_populates="products")

class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    order_number = Column(String(20))
    items = Column(JSON, nullable=False)
    subtotal = Column(Float, nullable=False)
    delivery_fee = Column(Float, default=0)
    discount = Column(Float, default=0)
    total = Column(Float, nullable=False)
    customer_name = Column(String(255))
    customer_phone = Column(String(50))
    customer_address = Column(Text)
    payment_method = Column(String(50))
    order_type = Column(String(50), default="delivery")
    status = Column(String(50), default="pending")
    source = Column(String(50), default="direct")
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    restaurant = relationship("Restaurant", back_populates="orders")

class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"
    
    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    event_type = Column(String(50), nullable=False)
    product_id = Column(Integer)
    category_id = Column(Integer)
    source = Column(String(100))
    metadata = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

# Create tables
try:
    Base.metadata.create_all(bind=engine)
    print("✅ PostgreSQL tables created")
except Exception as e:
    print(f"⚠️ Database setup note: {e}")

# ============== SECURITY ==============
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

# ============== DEPENDENCIES ==============
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    if not credentials:
        raise HTTPException(status_code=401, detail="Não autorizado")
    
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Token inválido")
    
    user = db.query(User).filter(User.id == payload.get("user_id")).first()
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    
    return user

async def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    if not credentials:
        return None
    payload = decode_token(credentials.credentials)
    if not payload:
        return None
    return db.query(User).filter(User.id == payload.get("user_id")).first()

# ============== PYDANTIC SCHEMAS ==============
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    restaurant_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class RestaurantUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    logo: Optional[str] = None
    banner: Optional[str] = None
    address: Optional[str] = None
    whatsapp: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    is_open: Optional[bool] = None
    closed_message: Optional[str] = None
    opening_hours: Optional[Dict] = None
    min_order: Optional[float] = None
    delivery_fee: Optional[float] = None
    payment_methods: Optional[List[str]] = None
    whatsapp_message: Optional[str] = None

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    image: Optional[str] = None
    order: Optional[int] = 0

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    image: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None

class ProductCreate(BaseModel):
    category_id: int
    name: str
    description: Optional[str] = None
    price: float
    promo_price: Optional[float] = None
    image: Optional[str] = None
    gallery: Optional[List[str]] = []
    is_featured: Optional[bool] = False
    featured_tag: Optional[str] = None
    variations: Optional[List[Dict]] = []
    removable_ingredients: Optional[List[str]] = []

class ProductUpdate(BaseModel):
    category_id: Optional[int] = None
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    promo_price: Optional[float] = None
    image: Optional[str] = None
    gallery: Optional[List[str]] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None
    featured_tag: Optional[str] = None
    order: Optional[int] = None
    variations: Optional[List[Dict]] = None
    removable_ingredients: Optional[List[str]] = None

class OrderCreate(BaseModel):
    items: List[Dict]
    subtotal: float
    delivery_fee: Optional[float] = 0
    discount: Optional[float] = 0
    total: float
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    payment_method: Optional[str] = None
    order_type: Optional[str] = "delivery"
    source: Optional[str] = "direct"
    notes: Optional[str] = None

class EventCreate(BaseModel):
    event_type: str
    product_id: Optional[int] = None
    category_id: Optional[int] = None
    source: Optional[str] = None
    metadata: Optional[Dict] = None

# ============== HELPERS ==============
def generate_slug(name: str) -> str:
    slug = name.lower()
    slug = re.sub(r'[áàâã]', 'a', slug)
    slug = re.sub(r'[éèê]', 'e', slug)
    slug = re.sub(r'[íìî]', 'i', slug)
    slug = re.sub(r'[óòôõ]', 'o', slug)
    slug = re.sub(r'[úùû]', 'u', slug)
    slug = re.sub(r'[ç]', 'c', slug)
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    slug = slug.strip('-')
    return slug

def serialize_restaurant(r):
    return {
        "id": r.id,
        "slug": r.slug,
        "name": r.name,
        "description": r.description,
        "logo": r.logo,
        "banner": r.banner,
        "address": r.address,
        "whatsapp": r.whatsapp,
        "primary_color": r.primary_color,
        "secondary_color": r.secondary_color,
        "is_open": r.is_open,
        "closed_message": r.closed_message,
        "opening_hours": r.opening_hours,
        "min_order": r.min_order,
        "delivery_fee": r.delivery_fee,
        "payment_methods": r.payment_methods,
        "whatsapp_message": r.whatsapp_message,
        "plan": r.plan
    }

def serialize_category(c):
    return {
        "id": c.id,
        "name": c.name,
        "description": c.description,
        "icon": c.icon,
        "image": c.image,
        "order": c.order,
        "is_active": c.is_active
    }

def serialize_product(p):
    return {
        "id": p.id,
        "category_id": p.category_id,
        "name": p.name,
        "description": p.description,
        "price": p.price,
        "promo_price": p.promo_price,
        "image": p.image,
        "gallery": p.gallery or [],
        "is_active": p.is_active,
        "is_featured": p.is_featured,
        "featured_tag": p.featured_tag,
        "order": p.order,
        "variations": p.variations or [],
        "removable_ingredients": p.removable_ingredients or [],
        "views": p.views,
        "orders_count": p.orders_count
    }

def serialize_order(o):
    return {
        "id": o.id,
        "order_number": o.order_number,
        "items": o.items,
        "subtotal": o.subtotal,
        "delivery_fee": o.delivery_fee,
        "discount": o.discount,
        "total": o.total,
        "customer_name": o.customer_name,
        "customer_phone": o.customer_phone,
        "customer_address": o.customer_address,
        "payment_method": o.payment_method,
        "order_type": o.order_type,
        "status": o.status,
        "source": o.source,
        "created_at": o.created_at.isoformat() if o.created_at else None
    }

# ============== APP ==============
app = FastAPI(title="Seven Menu SaaS API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============== ROOT ==============
@app.get("/")
def root():
    return {"status": "ok", "service": "Seven Menu SaaS API", "version": "3.0.0"}

@app.get("/api")
def api_root():
    return {"message": "Seven Menu SaaS API", "version": "3.0.0"}

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# ============== AUTH ==============
@app.post("/api/auth/register")
def register(data: UserRegister, db: Session = Depends(get_db)):
    # Check if email exists
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    # Generate slug
    slug = generate_slug(data.restaurant_name)
    base_slug = slug
    counter = 1
    while db.query(Restaurant).filter(Restaurant.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1
    
    # Create restaurant
    restaurant = Restaurant(
        slug=slug,
        name=data.restaurant_name,
        whatsapp_message=f"Olá! Gostaria de fazer um pedido no {data.restaurant_name}."
    )
    db.add(restaurant)
    db.commit()
    db.refresh(restaurant)
    
    # Create user
    user = User(
        email=data.email,
        password_hash=get_password_hash(data.password),
        name=data.name,
        restaurant_id=restaurant.id,
        role="owner"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Generate token
    token = create_access_token({
        "user_id": user.id,
        "restaurant_id": restaurant.id,
        "email": user.email
    })
    
    return {
        "success": True,
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role
        },
        "restaurant": serialize_restaurant(restaurant)
    }

@app.post("/api/auth/login")
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Conta desativada")
    
    restaurant = db.query(Restaurant).filter(Restaurant.id == user.restaurant_id).first()
    
    token = create_access_token({
        "user_id": user.id,
        "restaurant_id": user.restaurant_id,
        "email": user.email
    })
    
    return {
        "success": True,
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role
        },
        "restaurant": serialize_restaurant(restaurant) if restaurant else None
    }

@app.get("/api/auth/me")
def get_me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    restaurant = db.query(Restaurant).filter(Restaurant.id == user.restaurant_id).first()
    
    return {
        "success": True,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role
        },
        "restaurant": serialize_restaurant(restaurant) if restaurant else None
    }

# ============== RESTAURANT (Protected) ==============
@app.get("/api/restaurant/me")
def get_my_restaurant(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    restaurant = db.query(Restaurant).filter(Restaurant.id == user.restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurante não encontrado")
    return {"success": True, "restaurant": serialize_restaurant(restaurant)}

@app.put("/api/restaurant/me")
def update_my_restaurant(
    data: RestaurantUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    restaurant = db.query(Restaurant).filter(Restaurant.id == user.restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurante não encontrado")
    
    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(restaurant, key, value)
    
    restaurant.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(restaurant)
    
    return {"success": True, "restaurant": serialize_restaurant(restaurant)}

# ============== CATEGORIES (Protected) ==============
@app.get("/api/categories")
def get_categories(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    categories = db.query(Category).filter(
        Category.restaurant_id == user.restaurant_id
    ).order_by(Category.order).all()
    
    return {"success": True, "categories": [serialize_category(c) for c in categories]}

@app.post("/api/categories")
def create_category(
    data: CategoryCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    category = Category(
        restaurant_id=user.restaurant_id,
        **data.dict()
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    
    return {"success": True, "category": serialize_category(category)}

@app.put("/api/categories/{category_id}")
def update_category(
    category_id: int,
    data: CategoryUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    category = db.query(Category).filter(
        Category.id == category_id,
        Category.restaurant_id == user.restaurant_id
    ).first()
    
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(category, key, value)
    
    db.commit()
    db.refresh(category)
    
    return {"success": True, "category": serialize_category(category)}

@app.delete("/api/categories/{category_id}")
def delete_category(
    category_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    category = db.query(Category).filter(
        Category.id == category_id,
        Category.restaurant_id == user.restaurant_id
    ).first()
    
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    db.delete(category)
    db.commit()
    
    return {"success": True, "message": "Categoria excluída"}

@app.put("/api/categories/reorder")
def reorder_categories(
    orders: List[Dict[str, int]] = Body(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    for item in orders:
        db.query(Category).filter(
            Category.id == item["id"],
            Category.restaurant_id == user.restaurant_id
        ).update({"order": item["order"]})
    db.commit()
    return {"success": True}

# ============== PRODUCTS (Protected) ==============
@app.get("/api/products")
def get_products(
    category_id: Optional[int] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Product).filter(Product.restaurant_id == user.restaurant_id)
    if category_id:
        query = query.filter(Product.category_id == category_id)
    products = query.order_by(Product.order).all()
    
    return {"success": True, "products": [serialize_product(p) for p in products]}

@app.post("/api/products")
def create_product(
    data: ProductCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify category belongs to restaurant
    category = db.query(Category).filter(
        Category.id == data.category_id,
        Category.restaurant_id == user.restaurant_id
    ).first()
    if not category:
        raise HTTPException(status_code=400, detail="Categoria inválida")
    
    product = Product(
        restaurant_id=user.restaurant_id,
        **data.dict()
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    
    return {"success": True, "product": serialize_product(product)}

@app.put("/api/products/{product_id}")
def update_product(
    product_id: int,
    data: ProductUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.restaurant_id == user.restaurant_id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(product, key, value)
    
    db.commit()
    db.refresh(product)
    
    return {"success": True, "product": serialize_product(product)}

@app.delete("/api/products/{product_id}")
def delete_product(
    product_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.restaurant_id == user.restaurant_id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    db.delete(product)
    db.commit()
    
    return {"success": True, "message": "Produto excluído"}

@app.patch("/api/products/{product_id}/toggle")
def toggle_product(
    product_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.restaurant_id == user.restaurant_id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    product.is_active = not product.is_active
    db.commit()
    
    return {"success": True, "is_active": product.is_active}

# ============== PUBLIC MENU ==============
@app.get("/api/menu/{slug}")
def get_public_menu(slug: str, db: Session = Depends(get_db)):
    restaurant = db.query(Restaurant).filter(
        Restaurant.slug == slug,
        Restaurant.is_active == True
    ).first()
    
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurante não encontrado")
    
    categories = db.query(Category).filter(
        Category.restaurant_id == restaurant.id,
        Category.is_active == True
    ).order_by(Category.order).all()
    
    products = db.query(Product).filter(
        Product.restaurant_id == restaurant.id,
        Product.is_active == True
    ).order_by(Product.order).all()
    
    return {
        "success": True,
        "restaurant": serialize_restaurant(restaurant),
        "categories": [serialize_category(c) for c in categories],
        "products": [serialize_product(p) for p in products]
    }

# ============== ORDERS ==============
@app.get("/api/orders")
def get_orders(
    status: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Order).filter(Order.restaurant_id == user.restaurant_id)
    if status:
        query = query.filter(Order.status == status)
    orders = query.order_by(Order.created_at.desc()).limit(100).all()
    
    return {"success": True, "orders": [serialize_order(o) for o in orders]}

@app.post("/api/menu/{slug}/orders")
def create_public_order(
    slug: str,
    data: OrderCreate,
    db: Session = Depends(get_db)
):
    restaurant = db.query(Restaurant).filter(Restaurant.slug == slug).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurante não encontrado")
    
    order = Order(
        restaurant_id=restaurant.id,
        order_number=f"#{random.randint(1000, 9999)}",
        **data.dict()
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    
    # Update product stats
    for item in data.items:
        if "product_id" in item:
            db.query(Product).filter(Product.id == item["product_id"]).update({
                "orders_count": Product.orders_count + item.get("quantity", 1),
                "revenue": Product.revenue + (item.get("price", 0) * item.get("quantity", 1))
            })
    db.commit()
    
    return {"success": True, "order": serialize_order(order)}

@app.put("/api/orders/{order_id}/status")
def update_order_status(
    order_id: int,
    status: str = Body(..., embed=True),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.restaurant_id == user.restaurant_id
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    
    order.status = status
    db.commit()
    
    return {"success": True, "message": "Status atualizado"}

# ============== ANALYTICS ==============
@app.post("/api/menu/{slug}/analytics")
def track_public_event(slug: str, data: EventCreate, db: Session = Depends(get_db)):
    restaurant = db.query(Restaurant).filter(Restaurant.slug == slug).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurante não encontrado")
    
    event = AnalyticsEvent(
        restaurant_id=restaurant.id,
        **data.dict()
    )
    db.add(event)
    
    # Update product stats
    if data.product_id and data.event_type in ["product_view", "add_to_cart", "product_click"]:
        update = {}
        if data.event_type == "product_view":
            update["views"] = Product.views + 1
        elif data.event_type == "add_to_cart":
            update["cart_adds"] = Product.cart_adds + 1
        elif data.event_type == "product_click":
            update["clicks"] = Product.clicks + 1
        
        if update:
            db.query(Product).filter(Product.id == data.product_id).update(update)
    
    db.commit()
    return {"success": True}

@app.get("/api/analytics/dashboard")
def get_dashboard(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday = today - timedelta(days=1)
    
    # Today's stats
    today_orders = db.query(Order).filter(
        Order.restaurant_id == user.restaurant_id,
        Order.created_at >= today
    ).all()
    
    yesterday_orders = db.query(Order).filter(
        Order.restaurant_id == user.restaurant_id,
        Order.created_at >= yesterday,
        Order.created_at < today
    ).all()
    
    today_count = len(today_orders)
    today_revenue = sum(o.total for o in today_orders)
    today_avg = today_revenue / today_count if today_count > 0 else 0
    
    yesterday_count = len(yesterday_orders)
    yesterday_revenue = sum(o.total for o in yesterday_orders)
    
    # Growth
    revenue_growth = ((today_revenue - yesterday_revenue) / yesterday_revenue * 100) if yesterday_revenue > 0 else 0
    orders_growth = ((today_count - yesterday_count) / yesterday_count * 100) if yesterday_count > 0 else 0
    
    # Funnel
    page_views = db.query(AnalyticsEvent).filter(
        AnalyticsEvent.restaurant_id == user.restaurant_id,
        AnalyticsEvent.event_type == "page_view",
        AnalyticsEvent.created_at >= today
    ).count()
    
    cart_adds = db.query(AnalyticsEvent).filter(
        AnalyticsEvent.restaurant_id == user.restaurant_id,
        AnalyticsEvent.event_type == "add_to_cart",
        AnalyticsEvent.created_at >= today
    ).count()
    
    checkout_clicks = db.query(AnalyticsEvent).filter(
        AnalyticsEvent.restaurant_id == user.restaurant_id,
        AnalyticsEvent.event_type == "checkout_click",
        AnalyticsEvent.created_at >= today
    ).count()
    
    # Top products
    top_products = db.query(Product).filter(
        Product.restaurant_id == user.restaurant_id
    ).order_by(Product.orders_count.desc()).limit(5).all()
    
    return {
        "success": True,
        "dashboard": {
            "today": {
                "orders": today_count,
                "revenue": round(today_revenue, 2),
                "avg_ticket": round(today_avg, 2)
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
            "top_products": [
                {"name": p.name, "orders": p.orders_count, "revenue": p.revenue}
                for p in top_products
            ]
        }
    }

# ============== QR CODE ==============
@app.get("/api/restaurant/qrcode")
def generate_qrcode(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    restaurant = db.query(Restaurant).filter(Restaurant.id == user.restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurante não encontrado")
    
    base_url = os.getenv("FRONTEND_URL", "https://eatdash-6.preview.emergentagent.com")
    menu_url = f"{base_url}/{restaurant.slug}"
    
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

# ============== LEGACY COMPATIBILITY ==============
# Keep old endpoints working during transition
@app.get("/api/restaurants")
def get_restaurants_legacy(db: Session = Depends(get_db)):
    restaurants = db.query(Restaurant).filter(Restaurant.is_active == True).limit(100).all()
    return {"success": True, "restaurants": [serialize_restaurant(r) for r in restaurants]}

@app.get("/api/restaurants/{restaurant_id}")
def get_restaurant_legacy(restaurant_id: str, db: Session = Depends(get_db)):
    try:
        rid = int(restaurant_id)
        restaurant = db.query(Restaurant).filter(Restaurant.id == rid).first()
    except:
        restaurant = db.query(Restaurant).filter(Restaurant.slug == restaurant_id).first()
    
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurante não encontrado")
    return {"success": True, "restaurant": serialize_restaurant(restaurant)}

@app.get("/api/restaurants/{restaurant_id}/categories")
def get_categories_legacy(restaurant_id: str, db: Session = Depends(get_db)):
    try:
        rid = int(restaurant_id)
    except:
        rest = db.query(Restaurant).filter(Restaurant.slug == restaurant_id).first()
        rid = rest.id if rest else 0
    
    categories = db.query(Category).filter(
        Category.restaurant_id == rid,
        Category.is_active == True
    ).order_by(Category.order).all()
    
    return {"success": True, "categories": [serialize_category(c) for c in categories]}

@app.get("/api/restaurants/{restaurant_id}/products")
def get_products_legacy(restaurant_id: str, db: Session = Depends(get_db)):
    try:
        rid = int(restaurant_id)
    except:
        rest = db.query(Restaurant).filter(Restaurant.slug == restaurant_id).first()
        rid = rest.id if rest else 0
    
    products = db.query(Product).filter(
        Product.restaurant_id == rid,
        Product.is_active == True
    ).order_by(Product.order).all()
    
    return {"success": True, "products": [serialize_product(p) for p in products]}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
