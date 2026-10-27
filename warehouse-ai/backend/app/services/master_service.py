"""
Category, Unit, and Supplier services
"""
from sqlalchemy.orm import Session
from app.models import Category, Unit, Supplier
from app.exceptions import DuplicateResourceException, ResourceNotFoundException


class CategoryService:
    """Service for category operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def list_categories(self, skip: int = 0, limit: int = 100):
        """List all active categories"""
        return self.db.query(Category).filter(
            Category.is_active == True
        ).offset(skip).limit(limit).all()
    
    def get_category_by_id(self, category_id: int) -> Category:
        """Get category by ID"""
        category = self.db.query(Category).filter(Category.id == category_id).first()
        if not category:
            raise ResourceNotFoundException(f"Category with ID {category_id} not found")
        return category
    
    def create_category(self, name: str, description: str = None) -> Category:
        """Create new category"""
        existing = self.db.query(Category).filter(Category.name == name).first()
        if existing:
            raise DuplicateResourceException(f"Category '{name}' already exists")
        
        category = Category(name=name, description=description, is_active=True)
        self.db.add(category)
        self.db.commit()
        self.db.refresh(category)
        return category
    
    def update_category(self, category_id: int, name: str = None, description: str = None) -> Category:
        """Update category"""
        category = self.get_category_by_id(category_id)
        
        if name:
            existing = self.db.query(Category).filter(
                Category.name == name,
                Category.id != category_id
            ).first()
            if existing:
                raise DuplicateResourceException(f"Category '{name}' already exists")
            category.name = name
        
        if description is not None:
            category.description = description
        
        self.db.commit()
        self.db.refresh(category)
        return category
    
    def delete_category(self, category_id: int) -> bool:
        """Soft delete category"""
        category = self.get_category_by_id(category_id)
        category.is_active = False
        self.db.commit()
        return True


class UnitService:
    """Service for unit operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def list_units(self, skip: int = 0, limit: int = 100):
        """List all units"""
        return self.db.query(Unit).offset(skip).limit(limit).all()
    
    def get_unit_by_id(self, unit_id: int) -> Unit:
        """Get unit by ID"""
        unit = self.db.query(Unit).filter(Unit.id == unit_id).first()
        if not unit:
            raise ResourceNotFoundException(f"Unit with ID {unit_id} not found")
        return unit
    
    def create_unit(self, name: str, abbreviation: str) -> Unit:
        """Create new unit"""
        existing_name = self.db.query(Unit).filter(Unit.name == name).first()
        if existing_name:
            raise DuplicateResourceException(f"Unit '{name}' already exists")
        
        existing_abbr = self.db.query(Unit).filter(Unit.abbreviation == abbreviation).first()
        if existing_abbr:
            raise DuplicateResourceException(f"Abbreviation '{abbreviation}' already exists")
        
        unit = Unit(name=name, abbreviation=abbreviation)
        self.db.add(unit)
        self.db.commit()
        self.db.refresh(unit)
        return unit
    
    def update_unit(self, unit_id: int, name: str = None, abbreviation: str = None) -> Unit:
        """Update unit"""
        unit = self.get_unit_by_id(unit_id)
        
        if name:
            existing = self.db.query(Unit).filter(
                Unit.name == name,
                Unit.id != unit_id
            ).first()
            if existing:
                raise DuplicateResourceException(f"Unit '{name}' already exists")
            unit.name = name
        
        if abbreviation:
            existing = self.db.query(Unit).filter(
                Unit.abbreviation == abbreviation,
                Unit.id != unit_id
            ).first()
            if existing:
                raise DuplicateResourceException(f"Abbreviation '{abbreviation}' already exists")
            unit.abbreviation = abbreviation
        
        self.db.commit()
        self.db.refresh(unit)
        return unit
    
    def delete_unit(self, unit_id: int) -> bool:
        """Delete unit"""
        unit = self.get_unit_by_id(unit_id)
        self.db.delete(unit)
        self.db.commit()
        return True


class SupplierService:
    """Service for supplier operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def list_suppliers(self, skip: int = 0, limit: int = 100):
        """List all active suppliers"""
        return self.db.query(Supplier).filter(
            Supplier.is_active == True
        ).offset(skip).limit(limit).all()
    
    def get_supplier_by_id(self, supplier_id: int) -> Supplier:
        """Get supplier by ID"""
        supplier = self.db.query(Supplier).filter(Supplier.id == supplier_id).first()
        if not supplier:
            raise ResourceNotFoundException(f"Supplier with ID {supplier_id} not found")
        return supplier
    
    def create_supplier(self, code: str, name: str, contact_person: str = None, 
                       phone: str = None, email: str = None, address: str = None,
                       city: str = None, country: str = None) -> Supplier:
        """Create new supplier"""
        existing = self.db.query(Supplier).filter(Supplier.code == code).first()
        if existing:
            raise DuplicateResourceException(f"Supplier with code '{code}' already exists")
        
        supplier = Supplier(
            code=code,
            name=name,
            contact_person=contact_person,
            phone=phone,
            email=email,
            address=address,
            city=city,
            country=country,
            is_active=True
        )
        self.db.add(supplier)
        self.db.commit()
        self.db.refresh(supplier)
        return supplier
    
    def update_supplier(self, supplier_id: int, **kwargs) -> Supplier:
        """Update supplier"""
        supplier = self.get_supplier_by_id(supplier_id)
        
        if "code" in kwargs and kwargs["code"]:
            existing = self.db.query(Supplier).filter(
                Supplier.code == kwargs["code"],
                Supplier.id != supplier_id
            ).first()
            if existing:
                raise DuplicateResourceException(f"Supplier with code '{kwargs['code']}' already exists")
        
        for key, value in kwargs.items():
            if value is not None and hasattr(supplier, key):
                setattr(supplier, key, value)
        
        self.db.commit()
        self.db.refresh(supplier)
        return supplier
    
    def delete_supplier(self, supplier_id: int) -> bool:
        """Soft delete supplier"""
        supplier = self.get_supplier_by_id(supplier_id)
        supplier.is_active = False
        self.db.commit()
        return True
