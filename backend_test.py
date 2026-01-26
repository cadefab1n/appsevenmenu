#!/usr/bin/env python3
"""
Backend API Tests for Seven Menu Experience
Tests all CRUD operations for restaurants, categories, products, and QR code generation
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Base URL from frontend environment
BASE_URL = "https://menuseven.preview.emergentagent.com/api"

# Test data IDs mentioned in review request
EXISTING_RESTAURANT_ID = "6977a5e68d12c53dc00660d9"
EXISTING_CATEGORY_IDS = {
    "pizzas": "6977a5f18d12c53dc00660da",
    "bebidas": "6977a5f78d12c53dc00660db", 
    "sobremesas": "6977a5fc8d12c53dc00660dc"
}

class APITester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.created_ids = {
            "restaurants": [],
            "categories": [],
            "products": []
        }
    
    def log_test(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        if response_data and not success:
            print(f"   Response: {response_data}")
        print()
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "response": response_data
        })
    
    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> tuple:
        """Make HTTP request and return (success, response_data, status_code)"""
        url = f"{BASE_URL}{endpoint}"
        try:
            if method.upper() == "GET":
                response = self.session.get(url)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data)
            elif method.upper() == "PATCH":
                response = self.session.patch(url, json=data)
            elif method.upper() == "DELETE":
                response = self.session.delete(url)
            else:
                return False, f"Unsupported method: {method}", 0
            
            try:
                response_data = response.json()
            except:
                response_data = response.text
            
            return response.status_code < 400, response_data, response.status_code
        except Exception as e:
            return False, str(e), 0

    def test_api_root(self):
        """Test API root endpoint"""
        success, data, status = self.make_request("GET", "")
        expected_keys = ["message", "version"]
        
        if success and isinstance(data, dict):
            has_keys = all(key in data for key in expected_keys)
            self.log_test("API Root Endpoint", has_keys, 
                         f"Status: {status}, Keys present: {has_keys}")
        else:
            self.log_test("API Root Endpoint", False, 
                         f"Status: {status}, Response: {data}")

    def test_restaurants_crud(self):
        """Test Restaurant CRUD operations"""
        print("=== TESTING RESTAURANTS API ===")
        
        # Test GET all restaurants
        success, data, status = self.make_request("GET", "/restaurants")
        self.log_test("GET /restaurants (list all)", success and status == 200,
                     f"Status: {status}, Success field: {data.get('success') if isinstance(data, dict) else 'N/A'}")
        
        # Test GET specific restaurant (existing)
        success, data, status = self.make_request("GET", f"/restaurants/{EXISTING_RESTAURANT_ID}")
        self.log_test("GET /restaurants/{id} (existing)", success and status == 200,
                     f"Status: {status}, Restaurant found: {isinstance(data, dict) and data.get('success')}")
        
        # Test GET with invalid ID
        success, data, status = self.make_request("GET", "/restaurants/invalid_id")
        self.log_test("GET /restaurants/{id} (invalid ID)", status == 400,
                     f"Status: {status}, Correctly handles invalid ID")
        
        # Test GET non-existent restaurant
        success, data, status = self.make_request("GET", "/restaurants/507f1f77bcf86cd799439011")
        self.log_test("GET /restaurants/{id} (not found)", status == 404,
                     f"Status: {status}, Correctly returns 404")
        
        # Test POST create restaurant
        new_restaurant = {
            "name": "Restaurante Teste API",
            "whatsapp": "+5511999887766",
            "address": "Rua das Flores, 123 - São Paulo, SP",
            "primary_color": "#FF5722",
            "secondary_color": "#2196F3",
            "description": "Restaurante criado durante teste automatizado"
        }
        
        success, data, status = self.make_request("POST", "/restaurants", new_restaurant)
        if success and isinstance(data, dict) and data.get('success'):
            restaurant_id = data.get('restaurant', {}).get('id')
            if restaurant_id:
                self.created_ids["restaurants"].append(restaurant_id)
            self.log_test("POST /restaurants (create)", True,
                         f"Status: {status}, Created ID: {restaurant_id}")
        else:
            self.log_test("POST /restaurants (create)", False,
                         f"Status: {status}, Response: {data}")
        
        # Test PUT update restaurant (if we created one)
        if self.created_ids["restaurants"]:
            restaurant_id = self.created_ids["restaurants"][0]
            update_data = {
                "name": "Restaurante Teste API - Atualizado",
                "description": "Descrição atualizada via teste"
            }
            
            success, data, status = self.make_request("PUT", f"/restaurants/{restaurant_id}", update_data)
            self.log_test("PUT /restaurants/{id} (update)", success and status == 200,
                         f"Status: {status}, Update successful: {isinstance(data, dict) and data.get('success')}")
        
        # Test PUT with invalid ID
        success, data, status = self.make_request("PUT", "/restaurants/invalid_id", {"name": "Test"})
        self.log_test("PUT /restaurants/{id} (invalid ID)", status == 400,
                     f"Status: {status}, Correctly handles invalid ID")

    def test_categories_crud(self):
        """Test Categories CRUD operations"""
        print("=== TESTING CATEGORIES API ===")
        
        # Test GET categories for restaurant
        success, data, status = self.make_request("GET", f"/restaurants/{EXISTING_RESTAURANT_ID}/categories")
        self.log_test("GET /restaurants/{id}/categories", success and status == 200,
                     f"Status: {status}, Categories found: {len(data.get('categories', [])) if isinstance(data, dict) else 0}")
        
        # Test POST create category
        new_category = {
            "name": "Categoria Teste",
            "restaurant_id": EXISTING_RESTAURANT_ID,
            "order": 99,
            "active": True,
            "icon": "🍽️"
        }
        
        success, data, status = self.make_request("POST", "/categories", new_category)
        if success and isinstance(data, dict) and data.get('success'):
            category_id = data.get('category', {}).get('id')
            if category_id:
                self.created_ids["categories"].append(category_id)
            self.log_test("POST /categories (create)", True,
                         f"Status: {status}, Created ID: {category_id}")
        else:
            self.log_test("POST /categories (create)", False,
                         f"Status: {status}, Response: {data}")
        
        # Test PUT update category (using existing category)
        if EXISTING_CATEGORY_IDS["pizzas"]:
            update_data = {
                "name": "Pizzas Especiais - Teste",
                "restaurant_id": EXISTING_RESTAURANT_ID,
                "order": 1,
                "active": True
            }
            
            success, data, status = self.make_request("PUT", f"/categories/{EXISTING_CATEGORY_IDS['pizzas']}", update_data)
            self.log_test("PUT /categories/{id} (update)", success and status == 200,
                         f"Status: {status}, Update successful: {isinstance(data, dict) and data.get('success')}")
        
        # Test DELETE category (only if we created one and it has no products)
        if self.created_ids["categories"]:
            category_id = self.created_ids["categories"][0]
            success, data, status = self.make_request("DELETE", f"/categories/{category_id}")
            self.log_test("DELETE /categories/{id} (empty category)", success and status == 200,
                         f"Status: {status}, Delete successful: {isinstance(data, dict) and data.get('success')}")
        
        # Test DELETE category with products (should fail)
        success, data, status = self.make_request("DELETE", f"/categories/{EXISTING_CATEGORY_IDS['pizzas']}")
        self.log_test("DELETE /categories/{id} (with products)", status == 400,
                     f"Status: {status}, Correctly prevents deletion of category with products")

    def test_products_crud(self):
        """Test Products CRUD operations"""
        print("=== TESTING PRODUCTS API ===")
        
        # Test GET all products for restaurant
        success, data, status = self.make_request("GET", f"/restaurants/{EXISTING_RESTAURANT_ID}/products")
        self.log_test("GET /restaurants/{id}/products (all)", success and status == 200,
                     f"Status: {status}, Products found: {len(data.get('products', [])) if isinstance(data, dict) else 0}")
        
        # Test GET products filtered by category
        success, data, status = self.make_request("GET", f"/restaurants/{EXISTING_RESTAURANT_ID}/products?category_id={EXISTING_CATEGORY_IDS['pizzas']}")
        self.log_test("GET /restaurants/{id}/products?category_id (filter)", success and status == 200,
                     f"Status: {status}, Filtered products: {len(data.get('products', [])) if isinstance(data, dict) else 0}")
        
        # Test POST create product
        new_product = {
            "name": "Pizza Teste API",
            "description": "Pizza criada durante teste automatizado com ingredientes especiais",
            "price": 45.90,
            "category_id": EXISTING_CATEGORY_IDS["pizzas"],
            "restaurant_id": EXISTING_RESTAURANT_ID,
            "badges": ["escolha_inteligente", "mais_pedido"],
            "active": True,
            "order": 99
        }
        
        success, data, status = self.make_request("POST", "/products", new_product)
        if success and isinstance(data, dict) and data.get('success'):
            product_id = data.get('product', {}).get('id')
            if product_id:
                self.created_ids["products"].append(product_id)
            self.log_test("POST /products (create)", True,
                         f"Status: {status}, Created ID: {product_id}")
        else:
            self.log_test("POST /products (create)", False,
                         f"Status: {status}, Response: {data}")
        
        # Test GET specific product
        if self.created_ids["products"]:
            product_id = self.created_ids["products"][0]
            success, data, status = self.make_request("GET", f"/products/{product_id}")
            self.log_test("GET /products/{id} (specific)", success and status == 200,
                         f"Status: {status}, Product found: {isinstance(data, dict) and data.get('success')}")
        
        # Test PUT update product
        if self.created_ids["products"]:
            product_id = self.created_ids["products"][0]
            update_data = {
                "name": "Pizza Teste API - Atualizada",
                "price": 49.90,
                "badges": ["compartilhar", "escolha_inteligente"]
            }
            
            success, data, status = self.make_request("PUT", f"/products/{product_id}", update_data)
            self.log_test("PUT /products/{id} (update)", success and status == 200,
                         f"Status: {status}, Update successful: {isinstance(data, dict) and data.get('success')}")
        
        # Test PATCH toggle product
        if self.created_ids["products"]:
            product_id = self.created_ids["products"][0]
            success, data, status = self.make_request("PATCH", f"/products/{product_id}/toggle")
            self.log_test("PATCH /products/{id}/toggle", success and status == 200,
                         f"Status: {status}, Toggle successful: {isinstance(data, dict) and data.get('success')}")
        
        # Test DELETE product
        if self.created_ids["products"]:
            product_id = self.created_ids["products"][0]
            success, data, status = self.make_request("DELETE", f"/products/{product_id}")
            self.log_test("DELETE /products/{id}", success and status == 200,
                         f"Status: {status}, Delete successful: {isinstance(data, dict) and data.get('success')}")
        
        # Test GET with invalid product ID
        success, data, status = self.make_request("GET", "/products/invalid_id")
        self.log_test("GET /products/{id} (invalid ID)", status == 400,
                     f"Status: {status}, Correctly handles invalid ID")

    def test_qr_code_generation(self):
        """Test QR Code generation"""
        print("=== TESTING QR CODE API ===")
        
        # Test QR code generation for existing restaurant
        success, data, status = self.make_request("GET", f"/qrcode/{EXISTING_RESTAURANT_ID}")
        
        if success and isinstance(data, dict) and data.get('success'):
            qr_code = data.get('qr_code', '')
            url = data.get('url', '')
            
            # Validate base64 format
            is_valid_base64 = qr_code.startswith('data:image/png;base64,')
            # Validate URL format
            is_valid_url = url.startswith('https://menu.seven.app/')
            
            self.log_test("GET /qrcode/{id} (valid restaurant)", True,
                         f"Status: {status}, Valid base64: {is_valid_base64}, Valid URL: {is_valid_url}")
        else:
            self.log_test("GET /qrcode/{id} (valid restaurant)", False,
                         f"Status: {status}, Response: {data}")
        
        # Test QR code with invalid restaurant ID
        success, data, status = self.make_request("GET", "/qrcode/invalid_id")
        self.log_test("GET /qrcode/{id} (invalid ID)", status == 400,
                     f"Status: {status}, Correctly handles invalid ID")
        
        # Test QR code with non-existent restaurant
        success, data, status = self.make_request("GET", "/qrcode/507f1f77bcf86cd799439011")
        self.log_test("GET /qrcode/{id} (not found)", status == 404,
                     f"Status: {status}, Correctly returns 404")

    def test_error_handling(self):
        """Test error handling scenarios"""
        print("=== TESTING ERROR HANDLING ===")
        
        # Test missing required fields
        incomplete_restaurant = {"name": ""}  # Missing whatsapp
        success, data, status = self.make_request("POST", "/restaurants", incomplete_restaurant)
        self.log_test("POST /restaurants (missing required fields)", status >= 400,
                     f"Status: {status}, Correctly validates required fields")
        
        # Test invalid ObjectId format
        success, data, status = self.make_request("GET", "/restaurants/not_an_objectid")
        self.log_test("Invalid ObjectId handling", status == 400,
                     f"Status: {status}, Correctly handles invalid ObjectId")
        
        # Test empty update
        success, data, status = self.make_request("PUT", f"/restaurants/{EXISTING_RESTAURANT_ID}", {})
        self.log_test("PUT with empty data", status == 400,
                     f"Status: {status}, Correctly handles empty update")

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Seven Menu Experience Backend API Tests")
        print(f"📍 Base URL: {BASE_URL}")
        print("=" * 60)
        
        # Run test suites
        self.test_api_root()
        self.test_restaurants_crud()
        self.test_categories_crud()
        self.test_products_crud()
        self.test_qr_code_generation()
        self.test_error_handling()
        
        # Summary
        print("=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  ❌ {result['test']}: {result['details']}")
        
        print("\n" + "=" * 60)
        return failed_tests == 0

if __name__ == "__main__":
    tester = APITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)