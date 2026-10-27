"""
Product service - handles product CRUD operations
"""
from sqlalchemy.orm import Session
from app.models import Product, Category, Unit
from app.schemas.product import ProductCreate, ProductUpdate
from app.exceptions import DuplicateResourceException, ResourceNotFoundException


class ProductService:
    """Service for product operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def list_products(self, skip: int = 0, limit: int = 100, is_active: bool = True):
        """
        List all products with pagination
        
        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            is_active: Filter by active status
        
        Returns:
            List of Product objects
        """
        query = self.db.query(Product)
        
        if is_active is not None:
            query = query.filter(Product.is_active == is_active)
        
        return query.offset(skip).limit(limit).all()
    
    def get_product_by_id(self, product_id: int) -> Product:
        """
        Get product by ID
        
        Args:
            product_id: Product ID
        
        Returns:
            Product object
        
        Raises:
            ResourceNotFoundException: If product not found
        """
        product = self.db.query(Product).filter(Product.id == product_id).first()
        
        if not product:
            raise ResourceNotFoundException(f"Product with ID {product_id} not found")
        
        return product
    
    def get_product_by_code(self, code: str) -> Product:
        """
        Get product by code
        
        Args:
            code: Product code
        
        Returns:
            Product object
        
        Raises:
            ResourceNotFoundException: If product not found
        """
        product = self.db.query(Product).filter(Product.code == code).first()
        
        if not product:
            raise ResourceNotFoundException(f"Product with code {code} not found")
        
        return product
    
    def create_product(self, product_data: ProductCreate) -> Product:
        """
        Create new product
        
        Args:
            product_data: Product creation data
        
        Returns:
            Created Product object
        
        Raises:
            DuplicateResourceException: If product code already exists
            ResourceNotFoundException: If category or unit not found
        """
        # Check if code already exists
        existing = self.db.query(Product).filter(Product.code == product_data.code).first()
        if existing:
            raise DuplicateResourceException(f"Product with code {product_data.code} already exists")
        
        # Verify category exists
        category = self.db.query(Category).filter(Category.id == product_data.category_id).first()
        if not category:
            raise ResourceNotFoundException(f"Category with ID {product_data.category_id} not found")
        
        # Verify unit exists
        unit = self.db.query(Unit).filter(Unit.id == product_data.unit_id).first()
        if not unit:
            raise ResourceNotFoundException(f"Unit with ID {product_data.unit_id} not found")
        
        # Create product
        product = Product(**product_data.dict())
        self.db.add(product)
        self.db.commit()
        self.db.refresh(product)
        
        return product
    
    def update_product(self, product_id: int, product_data: ProductUpdate) -> Product:
        """
        Update product
        
        Args:
            product_id: Product ID
            product_data: Product update data
        
        Returns:
            Updated Product object
        
        Raises:
            ResourceNotFoundException: If product not found
        """
        product = self.get_product_by_id(product_id)
        
        # Update fields if provided
        update_data = product_data.dict(exclude_unset=True)
        
        if "category_id" in update_data:
            category = self.db.query(Category).filter(Category.id == update_data["category_id"]).first()
            if not category:
                raise ResourceNotFoundException(f"Category with ID {update_data['category_id']} not found")
        
        if "unit_id" in update_data:
            unit = self.db.query(Unit).filter(Unit.id == update_data["unit_id"]).first()
            if not unit:
                raise ResourceNotFoundException(f"Unit with ID {update_data['unit_id']} not found")
        
        for field, value in update_data.items():
            setattr(product, field, value)
        
        self.db.commit()
        self.db.refresh(product)
        
        return product
    
    def delete_product(self, product_id: int) -> bool:
        """
        Soft delete product (mark as inactive)
        
        Args:
            product_id: Product ID
        
        Returns:
            True if successful
        
        Raises:
            ResourceNotFoundException: If product not found
        """
        product = self.get_product_by_id(product_id)
        product.is_active = False
        self.db.commit()
        
        return True
    
    def get_low_stock_products(self, limit: int = 20):
        """
        Get products below minimum stock level
        
        Args:
            limit: Maximum number of records to return
        
        Returns:
            List of Product objects
        """
        return self.db.query(Product).filter(
            Product.current_stock < Product.minimum_stock,
            Product.is_active == True
        ).limit(limit).all()
    
    def update_stock(self, product_id: int, quantity_change: int) -> Product:
        """
        Update product stock quantity
        
        Args:
            product_id: Product ID
            quantity_change: Amount to add/subtract from stock
        
        Returns:
            Updated Product object
        
        Raises:
            ResourceNotFoundException: If product not found
        """
        product = self.get_product_by_id(product_id)
        product.current_stock = max(0, product.current_stock + quantity_change)
        self.db.commit()
        self.db.refresh(product)
        
        return product
