"""
Import/Export service - handles import and export receipt operations
"""
from sqlalchemy.orm import Session, joinedload
from datetime import date
from app.models import ImportReceipt, ImportReceiptItem, ExportReceipt, ExportReceiptItem, Product, User
from app.schemas.import_receipt import ImportReceiptCreate, ImportReceiptItemCreate
from app.schemas.export_receipt import ExportReceiptCreate, ExportReceiptItemCreate
from app.exceptions import ResourceNotFoundException, InvalidOperationException
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


class ImportReceiptService:
    """Service for import receipt operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def generate_receipt_code(self) -> str:
        """Generate unique import receipt code"""
        from datetime import datetime
        count = self.db.query(ImportReceipt).count() + 1
        return f"IMP-{datetime.now().strftime('%Y%m%d')}-{count:05d}"
    
    def list_import_receipts(self, skip: int = 0, limit: int = 100, status: str = None):
        """List import receipts with pagination"""
        query = self.db.query(ImportReceipt).options(joinedload(ImportReceipt.supplier))
        
        if status:
            query = query.filter(ImportReceipt.status == status)
        
        return query.offset(skip).limit(limit).all()
    
    def get_import_receipt_by_id(self, receipt_id: int) -> ImportReceipt:
        """Get import receipt by ID"""
        receipt = self.db.query(ImportReceipt).options(
            joinedload(ImportReceipt.supplier)
        ).filter(ImportReceipt.id == receipt_id).first()
        
        if not receipt:
            raise ResourceNotFoundException(f"Import receipt with ID {receipt_id} not found")
        
        return receipt
    
    def create_import_receipt(self, receipt_data: ImportReceiptCreate, created_by_id: int) -> ImportReceipt:
        """Create new import receipt with items"""
        # Generate unique code
        receipt_code = self.generate_receipt_code()
        
        # Create receipt
        receipt = ImportReceipt(
            receipt_code=receipt_code,
            supplier_id=receipt_data.supplier_id,
            receipt_date=receipt_data.receipt_date or date.today(),
            status="DRAFT",
            created_by=created_by_id,
            notes=receipt_data.notes,
            total_amount=Decimal(0)
        )
        
        self.db.add(receipt)
        self.db.flush()  # Get the ID without committing
        
        # Add items
        total = Decimal(0)
        for item_data in receipt_data.items:
            product = self.db.query(Product).filter(Product.id == item_data.product_id).first()
            if not product:
                raise ResourceNotFoundException(f"Product with ID {item_data.product_id} not found")
            
            item_total = Decimal(str(item_data.quantity)) * Decimal(str(item_data.unit_price))
            
            item = ImportReceiptItem(
                import_receipt_id=receipt.id,
                product_id=item_data.product_id,
                quantity=item_data.quantity,
                unit_price=Decimal(str(item_data.unit_price)),
                total_amount=item_total,
                notes=item_data.notes
            )
            
            self.db.add(item)
            total += item_total
        
        receipt.total_amount = total
        self.db.commit()
        self.db.refresh(receipt)
        
        logger.info(f"Import receipt created: {receipt.receipt_code}")
        return receipt
    
    def confirm_import_receipt(self, receipt_id: int, confirmed_by_id: int) -> ImportReceipt:
        """Confirm import receipt and update stock"""
        receipt = self.get_import_receipt_by_id(receipt_id)
        
        if receipt.status != "DRAFT":
            raise InvalidOperationException(f"Cannot confirm receipt with status {receipt.status}")
        
        # Update product stocks
        for item in receipt.items:
            product = item.product
            product.current_stock += item.quantity
        
        receipt.status = "CONFIRMED"
        receipt.confirmed_by = confirmed_by_id
        from datetime import datetime
        receipt.confirmed_at = datetime.now()
        
        self.db.commit()
        self.db.refresh(receipt)
        
        logger.info(f"Import receipt confirmed: {receipt.receipt_code}")
        return receipt
    
    def cancel_import_receipt(self, receipt_id: int) -> ImportReceipt:
        """Cancel import receipt"""
        receipt = self.get_import_receipt_by_id(receipt_id)
        
        if receipt.status != "DRAFT":
            raise InvalidOperationException(f"Cannot cancel receipt with status {receipt.status}")
        
        receipt.status = "CANCELLED"
        self.db.commit()
        self.db.refresh(receipt)
        
        logger.info(f"Import receipt cancelled: {receipt.receipt_code}")
        return receipt


class ExportReceiptService:
    """Service for export receipt operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def generate_receipt_code(self) -> str:
        """Generate unique export receipt code"""
        from datetime import datetime
        count = self.db.query(ExportReceipt).count() + 1
        return f"EXP-{datetime.now().strftime('%Y%m%d')}-{count:05d}"
    
    def list_export_receipts(self, skip: int = 0, limit: int = 100, status: str = None):
        """List export receipts with pagination"""
        query = self.db.query(ExportReceipt)
        
        if status:
            query = query.filter(ExportReceipt.status == status)
        
        return query.offset(skip).limit(limit).all()
    
    def get_export_receipt_by_id(self, receipt_id: int) -> ExportReceipt:
        """Get export receipt by ID"""
        receipt = self.db.query(ExportReceipt).filter(ExportReceipt.id == receipt_id).first()
        
        if not receipt:
            raise ResourceNotFoundException(f"Export receipt with ID {receipt_id} not found")
        
        return receipt
    
    def create_export_receipt(self, receipt_data: ExportReceiptCreate, created_by_id: int) -> ExportReceipt:
        """Create new export receipt with items"""
        # Generate unique code
        receipt_code = self.generate_receipt_code()
        
        # Create receipt
        receipt = ExportReceipt(
            receipt_code=receipt_code,
            receipt_date=receipt_data.receipt_date or date.today(),
            status="DRAFT",
            created_by=created_by_id,
            notes=receipt_data.notes
        )
        
        self.db.add(receipt)
        self.db.flush()  # Get the ID without committing
        
        # Add items
        for item_data in receipt_data.items:
            product = self.db.query(Product).filter(Product.id == item_data.product_id).first()
            if not product:
                raise ResourceNotFoundException(f"Product with ID {item_data.product_id} not found")
            
            # Check stock availability
            if product.current_stock < item_data.quantity:
                raise InvalidOperationException(
                    f"Insufficient stock for product {product.code}. Available: {product.current_stock}, Requested: {item_data.quantity}"
                )
            
            item = ExportReceiptItem(
                export_receipt_id=receipt.id,
                product_id=item_data.product_id,
                quantity=item_data.quantity,
                notes=item_data.notes
            )
            
            self.db.add(item)
        
        self.db.commit()
        self.db.refresh(receipt)
        
        logger.info(f"Export receipt created: {receipt.receipt_code}")
        return receipt
    
    def confirm_export_receipt(self, receipt_id: int, confirmed_by_id: int) -> ExportReceipt:
        """Confirm export receipt and update stock"""
        receipt = self.get_export_receipt_by_id(receipt_id)
        
        if receipt.status != "DRAFT":
            raise InvalidOperationException(f"Cannot confirm receipt with status {receipt.status}")
        
        # Update product stocks and verify availability
        for item in receipt.items:
            product = item.product
            
            if product.current_stock < item.quantity:
                raise InvalidOperationException(
                    f"Insufficient stock for product {product.code}. Available: {product.current_stock}, Requested: {item.quantity}"
                )
            
            product.current_stock -= item.quantity
        
        receipt.status = "CONFIRMED"
        receipt.confirmed_by = confirmed_by_id
        from datetime import datetime
        receipt.confirmed_at = datetime.now()
        
        self.db.commit()
        self.db.refresh(receipt)
        
        logger.info(f"Export receipt confirmed: {receipt.receipt_code}")
        return receipt
    
    def cancel_export_receipt(self, receipt_id: int) -> ExportReceipt:
        """Cancel export receipt"""
        receipt = self.get_export_receipt_by_id(receipt_id)
        
        if receipt.status != "DRAFT":
            raise InvalidOperationException(f"Cannot cancel receipt with status {receipt.status}")
        
        receipt.status = "CANCELLED"
        self.db.commit()
        self.db.refresh(receipt)
        
        logger.info(f"Export receipt cancelled: {receipt.receipt_code}")
        return receipt
