import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import JsBarcode from 'jsbarcode';
import {
  Package,
  Plus,
  Search,
  Trash2,
  Edit,
  X,
  Save,
  Filter,
  RotateCcw,
  Download,
  Upload,
  Loader2,
  Truck,
  CheckCircle,
  Printer,
  ArrowLeft,
  BarChart,
  ArrowUpDown,
  Users,
  Copy,
  Ban,
  LogOut,
  User,
  Lock,
  Building,
  ChevronDown,
  Shield,
  Settings,
  RotateCw
} from 'lucide-react';

// --- Helper Functions ---
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

const formatDateTime = (dateObj = new Date()) => {
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const seconds = String(dateObj.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

const getStorageKey = (companyId, key) => `${companyId}_${key}`;

// --- Constants & Initial Data ---
const COMPANIES = [
  { id: 'wintrend', name: 'Win Trend', fullName: 'Win Trend Electronic Technology Ltd' },
  { id: 'sunwise', name: 'Sunwise', fullName: 'Sunwise Technologies (HK) Ltd' }
];

const INITIAL_USERS = [
  { id: 999, username: 'dev', password: 'dev', role: 'developer', name: 'Developer' },
  { id: 1, username: 'admin', password: '888888', role: 'admin', name: 'Admin User' },
  { id: 2, username: 'manager', password: '888888', role: 'manager', name: 'Manager' },
  { id: 3, username: 'op', password: '123456', role: 'operator', name: 'Operator' },
  { id: 4, username: 'guest', password: '000000', role: 'viewer', name: 'Guest' }
];

const ROLES = {
  developer: { label: 'Developer', canAdd: true, canEdit: true, canDelete: true, canImport: true, canExport: true, canManageShipments: true, canConfirmShipment: true, canDeleteCompleted: true },
  admin: { label: 'Admin', canAdd: true, canEdit: true, canDelete: true, canImport: true, canExport: true, canManageShipments: true, canConfirmShipment: true, canDeleteCompleted: true },
  manager: { label: 'Manager', canAdd: true, canEdit: true, canDelete: true, canImport: true, canExport: true, canManageShipments: true, canConfirmShipment: true, canDeleteCompleted: true },
  operator: { label: 'Operator', canAdd: true, canEdit: false, canDelete: false, canImport: true, canExport: true, canManageShipments: true, canConfirmShipment: false, canDeleteCompleted: false },
  viewer: { label: 'Viewer', canAdd: false, canEdit: false, canDelete: false, canImport: false, canExport: false, canManageShipments: false, canConfirmShipment: false, canDeleteCompleted: false }
};

const INITIAL_INVENTORY = [
  { id: 1, name: 'Mechanical Keyboard', model: 'MK-800', bin: 'A-01', origin: 'Taiwan', brand: 'Logi', dc: '2345', lot: 'L001', quantity: 100 },
  { id: 2, name: 'Ergonomic Mouse', model: 'EM-202', bin: 'A-02', origin: 'China', brand: 'Razer', dc: '2350', lot: 'L002', quantity: 50 },
  { id: 3, name: '27" 4K Monitor', model: 'DP-4K27', bin: 'B-01', origin: 'Korea', brand: 'Samsung', dc: '2401', lot: 'L003', quantity: 20 },
  { id: 4, name: 'Type-C Cable', model: 'CB-TC1M', bin: 'C-05', origin: 'Vietnam', brand: 'Belkin', dc: '2330', lot: 'L004', quantity: 200 },
  { id: 5, name: 'Laptop Stand', model: 'ST-AL01', bin: 'C-06', origin: 'Taiwan', brand: '3M', dc: '2340', lot: 'L005', quantity: 15 },
  { id: 6, name: 'Mechanical Keyboard', model: 'MK-800', bin: 'A-01', origin: 'Taiwan', brand: 'Logi', dc: '2401', lot: 'L002', quantity: 50 },
];

const INITIAL_CUSTOMERS = [
  { id: 'CUST1463', shortName: 'Xiaosen', name: 'Guangzhou Xiaosen Intelligent Tech Co., Ltd', contact: 'CHLOE', phone: '13800138000', email: 'chloe@xiaosen.com' },
  { id: 'CUST1002', shortName: 'TaipeiTech', name: 'Taipei Tech Co., Ltd', contact: 'DAVID', phone: '02-27008888', email: 'david@taipeitech.com' },
];

// --- Components ---

const Barcode = ({ value, options = {} }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (canvasRef.current && value) {
      try {
        JsBarcode(canvasRef.current, value, {
          format: "CODE128",
          displayValue: true,
          fontSize: 12,
          margin: 0,
          height: 30,
          ...options
        });
      } catch (e) {
        console.error("Barcode generation error:", e);
      }
    }
  }, [value, options]);
  return value ? <canvas ref={canvasRef} /> : null;
};

// --- Main App Component ---
export default function App() {
  // --- State ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '', companyId: 'wintrend' });
  const [currentUser, setCurrentUser] = useState(null);
  const [loginError, setLoginError] = useState('');
  const [currentCompany, setCurrentCompany] = useState(COMPANIES[0]);

  const [currentView, setCurrentView] = useState('inventory');

  // Users (Global)
  const [users, setUsers] = useState(() => {
    try { return JSON.parse(localStorage.getItem('app_users')) || INITIAL_USERS; } catch { return INITIAL_USERS; }
  });

  // Data (Company Specific)
  const [inventory, setInventory] = useState(() => {
    try {
      const key = getStorageKey(COMPANIES[0].id, 'inventory_data');
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : INITIAL_INVENTORY;
    } catch { return INITIAL_INVENTORY; }
  });
  const [customers, setCustomers] = useState(() => {
    try {
      const key = getStorageKey(COMPANIES[0].id, 'customers_data');
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
    } catch { return INITIAL_CUSTOMERS; }
  });
  const [shipments, setShipments] = useState(() => {
    try {
      const key = getStorageKey(COMPANIES[0].id, 'shipments_data');
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [activeShipment, setActiveShipment] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showCustomerFilters, setShowCustomerFilters] = useState(false);
  const [showUserFilters, setShowUserFilters] = useState(false);
  const [filterUserRole, setFilterUserRole] = useState('all');

  // Shipment Filters
  const [shipmentSearchTerm, setShipmentSearchTerm] = useState('');
  const [showShipmentFilters, setShowShipmentFilters] = useState(false);
  const [filterShipmentStatus, setFilterShipmentStatus] = useState('all');
  const [filterShipmentDateStart, setFilterShipmentDateStart] = useState('');
  const [filterShipmentDateEnd, setFilterShipmentDateEnd] = useState('');
  const [filterShipmentDeliveryDateStart, setFilterShipmentDeliveryDateStart] = useState('');
  const [filterShipmentDeliveryDateEnd, setFilterShipmentDeliveryDateEnd] = useState('');
  const [filterShipmentApprovalDateStart, setFilterShipmentApprovalDateStart] = useState('');
  const [filterShipmentApprovalDateEnd, setFilterShipmentApprovalDateEnd] = useState('');
  const [filterShipmentCustomer, setFilterShipmentCustomer] = useState('');
  const [filterShipmentPreparedBy, setFilterShipmentPreparedBy] = useState('');
  const [filterShipmentApprovedBy, setFilterShipmentApprovedBy] = useState('');

  // Inventory Filters
  const [filterPartNo, setFilterPartNo] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterOrigin, setFilterOrigin] = useState('');
  const [filterDC, setFilterDC] = useState('');
  const [filterLot, setFilterLot] = useState('');
  const [filterBin, setFilterBin] = useState('');
  const [filterStock, setFilterStock] = useState('all');

  // Customer Filters
  const [filterCustId, setFilterCustId] = useState('');
  const [filterCustShortName, setFilterCustShortName] = useState('');
  const [filterCustName, setFilterCustName] = useState('');
  const [filterCustContact, setFilterCustContact] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [currentEditItem, setCurrentEditItem] = useState(null);
  const [currentEditCustomer, setCurrentEditCustomer] = useState(null);
  const [currentEditUser, setCurrentEditUser] = useState(null);

  // Forms
  const [formData, setFormData] = useState({ name: '', bin: '', origin: '', brand: '', dc: '', lot: '', quantity: 0 });
  const [customerFormData, setCustomerFormData] = useState({ id: '', shortName: '', name: '', contact: '', phone: '', email: '' });
  const [userFormData, setUserFormData] = useState({ username: '', password: '', name: '', role: 'operator' });

  const [isExcelReady, setIsExcelReady] = useState(true);
  const [summarySort, setSummarySort] = useState({ field: 'name', order: 'asc' });

  const fileInputRef = useRef(null);
  const customerFileInputRef = useRef(null);

  // --- Effects for Persistence ---
  useEffect(() => {
    localStorage.setItem('app_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (isLoggedIn && currentCompany) {
      const invKey = getStorageKey(currentCompany.id, 'inventory_data');
      const custKey = getStorageKey(currentCompany.id, 'customers_data');
      const shipKey = getStorageKey(currentCompany.id, 'shipments_data');

      localStorage.setItem(invKey, JSON.stringify(inventory));
      localStorage.setItem(custKey, JSON.stringify(customers));
      localStorage.setItem(shipKey, JSON.stringify(shipments));
    }
  }, [inventory, customers, shipments, isLoggedIn, currentCompany]);

  // --- Summary Data Calculation (Fix: Was Missing) ---
  const summaryData = useMemo(() => {
      const map = new Map();
      inventory.forEach(item => {
        if (!map.has(item.name)) {
          map.set(item.name, { name: item.name, count: 0, total: 0 });
        }
        const entry = map.get(item.name);
        entry.count += 1;
        entry.total += Number(item.quantity);
      });
      let result = Array.from(map.values());
      // Sort
      result.sort((a, b) => {
          const valA = a[summarySort.field];
          const valB = b[summarySort.field];
          if (valA < valB) return summarySort.order === 'asc' ? -1 : 1;
          if (valA > valB) return summarySort.order === 'asc' ? 1 : -1;
          return 0;
      });
      return result;
    }, [inventory, summarySort]);

  // --- Permissions ---
  const hasPermission = (action) => {
    if (!currentUser) return false;
    const perms = ROLES[currentUser.role];
    switch (action) {
      case 'add': return perms.canAdd;
      case 'edit': return perms.canEdit;
      case 'delete': return perms.canDelete;
      case 'import': return perms.canImport;
      case 'export': return perms.canExport;
      case 'manageShipments': return perms.canManageShipments;
      case 'confirmShipment': return perms.canConfirmShipment;
      case 'deleteCompleted': return perms.canDeleteCompleted;
      default: return false;
    }
  };

  // --- Reset & Handler Functions (Fix: Were Missing) ---
  const resetFilters = () => {
    setFilterPartNo(''); setFilterBrand(''); setFilterOrigin('');
    setFilterDC(''); setFilterLot(''); setFilterBin(''); setFilterStock('all');
    setSearchTerm('');
  };

  const resetCustomerFilters = () => {
    setFilterCustId(''); setFilterCustShortName('');
    setFilterCustName(''); setFilterCustContact('');
    setCustomerSearchTerm('');
  };

  const resetShipmentFilters = () => {
    setFilterShipmentStatus('all');
    setFilterShipmentDateStart(''); setFilterShipmentDateEnd('');
    setFilterShipmentDeliveryDateStart(''); setFilterShipmentDeliveryDateEnd('');
    setFilterShipmentApprovalDateStart(''); setFilterShipmentApprovalDateEnd('');
    setFilterShipmentCustomer(''); setFilterShipmentPreparedBy(''); setFilterShipmentApprovedBy('');
    setShipmentSearchTerm('');
  };

  const handleSummarySort = (field) => {
    setSummarySort(prev => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSelectCustomer = (e) => {
    const custId = e.target.value;
    const cust = customers.find(c => c.id === custId);
    if (cust) {
        setActiveShipment(prev => ({
            ...prev,
            customerInfo: {
                ...prev.customerInfo,
                id: cust.id,
                name: cust.name,
                shortName: cust.shortName,
                service: cust.contact || '', // Auto-fill service with contact for convenience
                shipmentType: 'Local' // Default
            }
        }));
    }
  };

  // --- Handlers for PickingListPreview (Fix: Were Missing) ---
  const updateShipmentField = (section, value, field = null) => {
    setActiveShipment(prev => {
        if (section === 'customerInfo') {
            return { ...prev, customerInfo: { ...prev.customerInfo, [field]: value } };
        }
        if (section === 'footer') {
            return { ...prev, footer: { ...prev.footer, [field]: value } };
        }
        return { ...prev, [section]: value };
    });
  };

  const updateShipmentItem = (index, field, value) => {
      setActiveShipment(prev => {
          const newItems = [...prev.items];
          newItems[index] = { ...newItems[index], [field]: field === 'quantity' ? Number(value) : value };
          return { ...prev, items: newItems };
      });
  };

  const removeShipmentItem = (index) => {
      if(!confirm('Remove this item?')) return;
      setActiveShipment(prev => {
          const newItems = prev.items.filter((_, i) => i !== index);
          return { ...prev, items: newItems };
      });
  };

  const updatePackingInfo = (index, field, value) => {
      setActiveShipment(prev => {
          const newPacking = [...prev.packingInfo];
          newPacking[index] = { ...newPacking[index], [field]: value };
          return { ...prev, packingInfo: newPacking };
      });
  };

  // --- Login Logic ---
  const handleLogin = (e) => {
    e.preventDefault();
    const user = users.find(u => u.username === loginData.username && u.password === loginData.password);
    if (user) {
      const selectedCompany = COMPANIES.find(c => c.id === loginData.companyId);
      
      const loadData = (key, defaultData) => {
        const storageKey = getStorageKey(selectedCompany.id, key);
        const saved = localStorage.getItem(storageKey);
        return saved ? JSON.parse(saved) : defaultData;
      };

      setInventory(loadData('inventory_data', INITIAL_INVENTORY));
      setCustomers(loadData('customers_data', INITIAL_CUSTOMERS));
      setShipments(loadData('shipments_data', []));

      setCurrentCompany(selectedCompany);
      setCurrentUser(user);
      setIsLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError('Invalid username or password');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoginData({ username: '', password: '', companyId: 'wintrend' });
    setCurrentUser(null);
    setCurrentView('inventory');
    setActiveShipment(null);
    setInventory([]);
    setCustomers([]);
    setShipments([]);
  };

  // --- User Management Logic ---
  const saveUser = () => {
    if (!userFormData.username || !userFormData.password || !userFormData.name) {
      alert("Please fill in all fields.");
      return;
    }

    if (currentEditUser) {
      setUsers(prev => prev.map(u => u.id === currentEditUser.id ? { ...userFormData, id: u.id } : u));
    } else {
      if (users.some(u => u.username === userFormData.username)) {
        alert("Username already exists.");
        return;
      }
      setUsers(prev => [...prev, { ...userFormData, id: Date.now() }]);
    }
    setIsUserModalOpen(false);
    setUserFormData({ username: '', password: '', name: '', role: 'operator' });
    setCurrentEditUser(null);
  };

  const deleteUser = (id) => {
    const targetUser = users.find(u => u.id === id);
    if (id === currentUser.id) {
      alert("Cannot delete your own account!");
      return;
    }
    
    if (currentUser.role === 'admin' && targetUser.role === 'developer') {
      alert("Admins cannot delete Developers.");
      return;
    }

    if (confirm('Are you sure you want to delete this user?')) {
      setUsers(prev => prev.filter(u => u.id !== id));
    }
  };
  
  const filteredUsers = users.filter(u => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin' && u.role === 'developer') {
      return false;
    }

    const term = userSearchTerm.toLowerCase();
    const matchesSearch = u.username.toLowerCase().includes(term) || u.name.toLowerCase().includes(term);
    const matchesRole = filterUserRole === 'all' ? true : u.role === filterUserRole;
    return matchesSearch && matchesRole;
  });

  const resetUserFilters = () => {
    setUserSearchTerm('');
    setFilterUserRole('all');
  };

  // --- Inventory Logic ---
  const getFilteredOptions = (fieldKey) => {
    return [...new Set(inventory.filter(item => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = 
        (item.name && item.name.toLowerCase().includes(term)) ||
        (item.brand && item.brand.toLowerCase().includes(term)) ||
        (item.origin && item.origin.toLowerCase().includes(term)) ||
        (item.dc && item.dc.toLowerCase().includes(term)) ||
        (item.lot && item.lot.toLowerCase().includes(term)) ||
        (item.bin && item.bin.toLowerCase().includes(term));

      if (!matchesSearch) return false;
      if (filterStock === 'in_stock' && item.quantity <= 0) return false;
      if (filterStock === 'out_of_stock' && item.quantity > 0) return false;

      if (fieldKey !== 'name' && filterPartNo && item.name !== filterPartNo) return false;
      if (fieldKey !== 'brand' && filterBrand && item.brand !== filterBrand) return false;
      if (fieldKey !== 'origin' && filterOrigin && item.origin !== filterOrigin) return false;
      if (fieldKey !== 'dc' && filterDC && item.dc !== filterDC) return false;
      if (fieldKey !== 'lot' && filterLot && item.lot !== filterLot) return false;
      if (fieldKey !== 'bin' && filterBin && item.bin !== filterBin) return false;

      return true;
    }).map(item => item[fieldKey]).filter(Boolean))].sort();
  };

  const uniquePartNos = useMemo(() => getFilteredOptions('name'), [inventory, searchTerm, filterStock, filterBrand, filterOrigin, filterDC, filterLot, filterBin]);
  const uniqueBrands = useMemo(() => getFilteredOptions('brand'), [inventory, searchTerm, filterStock, filterPartNo, filterOrigin, filterDC, filterLot, filterBin]);
  const uniqueOrigins = useMemo(() => getFilteredOptions('origin'), [inventory, searchTerm, filterStock, filterPartNo, filterBrand, filterDC, filterLot, filterBin]);
  const uniqueDCs = useMemo(() => getFilteredOptions('dc'), [inventory, searchTerm, filterStock, filterPartNo, filterBrand, filterOrigin, filterLot, filterBin]);
  const uniqueLots = useMemo(() => getFilteredOptions('lot'), [inventory, searchTerm, filterStock, filterPartNo, filterBrand, filterOrigin, filterDC, filterBin]);
  const uniqueBins = useMemo(() => getFilteredOptions('bin'), [inventory, searchTerm, filterStock, filterPartNo, filterBrand, filterOrigin, filterDC, filterLot]);

  const filteredInventory = inventory.filter(item => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      (item.name && item.name.toLowerCase().includes(term)) ||
      (item.brand && item.brand.toLowerCase().includes(term)) ||
      (item.origin && item.origin.toLowerCase().includes(term)) ||
      (item.dc && item.dc.toLowerCase().includes(term)) ||
      (item.lot && item.lot.toLowerCase().includes(term)) || 
      (item.bin && item.bin.toLowerCase().includes(term));

    const matchesPartNo = filterPartNo ? item.name === filterPartNo : true;
    const matchesBrand = filterBrand ? item.brand === filterBrand : true;
    const matchesOrigin = filterOrigin ? item.origin === filterOrigin : true;
    const matchesDC = filterDC ? item.dc === filterDC : true;
    const matchesLot = filterLot ? item.lot === filterLot : true;
    const matchesBin = filterBin ? item.bin === filterBin : true;
    const matchesStock = filterStock === 'all' ? true : filterStock === 'in_stock' ? item.quantity > 0 : item.quantity === 0;

    return matchesSearch && matchesPartNo && matchesBrand && matchesOrigin && matchesDC && matchesLot && matchesBin && matchesStock;
  }).sort((a, b) => a.name.localeCompare(b.name, 'zh-TW') || (a.dc || '').localeCompare(b.dc || '', undefined, { numeric: true }));

  // --- Customer Filter Logic ---
  const uniqueCustIds = useMemo(() => [...new Set(customers.map(c => c.id).filter(Boolean))].sort(), [customers]);
  const uniqueCustShortNames = useMemo(() => [...new Set(customers.map(c => c.shortName).filter(Boolean))].sort(), [customers]);
  const uniqueCustNames = useMemo(() => [...new Set(customers.map(c => c.name).filter(Boolean))].sort(), [customers]);
  const uniqueCustContacts = useMemo(() => [...new Set(customers.map(c => c.contact).filter(Boolean))].sort(), [customers]);

  const filteredCustomers = customers.filter(item => {
    const term = customerSearchTerm.toLowerCase();
    const matchesSearch = 
      item.id.toLowerCase().includes(term) ||
      (item.shortName && item.shortName.toLowerCase().includes(term)) ||
      item.name.toLowerCase().includes(term) ||
      (item.contact && item.contact.toLowerCase().includes(term)) ||
      (item.phone && item.phone.toLowerCase().includes(term)) ||
      (item.email && item.email.toLowerCase().includes(term));
    
    const matchesId = filterCustId ? item.id === filterCustId : true;
    const matchesShortName = filterCustShortName ? item.shortName === filterCustShortName : true;
    const matchesName = filterCustName ? item.name === filterCustName : true;
    const matchesContact = filterCustContact ? item.contact === filterCustContact : true;

    return matchesSearch && matchesId && matchesShortName && matchesName && matchesContact;
  });

  // --- Shipment Filter Logic ---
  const filteredShipments = shipments.filter(s => {
    const term = shipmentSearchTerm.toLowerCase();
    
    // Search in Header
    const matchesHeader = 
        s.pickOrderNo.toLowerCase().includes(term) || 
        (s.customerInfo.name && s.customerInfo.name.toLowerCase().includes(term)) ||
        (s.customerInfo.shortName && s.customerInfo.shortName.toLowerCase().includes(term)) || 
        (s.footer?.preparedBy && s.footer.preparedBy.toLowerCase().includes(term)) ||
        (s.footer?.approvedBy && s.footer.approvedBy.toLowerCase().includes(term));

    // Search in Items (Part No)
    const matchesItems = s.items.some(i => i.name.toLowerCase().includes(term));
    const matchesSearch = matchesHeader || matchesItems;

    const matchesStatus = filterShipmentStatus === 'all' ? true : s.status === filterShipmentStatus;
    
    // Create Date
    const cDate = new Date(s.createDate);
    const cStartDate = filterShipmentDateStart ? new Date(filterShipmentDateStart) : null;
    const cEndDate = filterShipmentDateEnd ? new Date(filterShipmentDateEnd) : null;
    let matchesDate = true;
    if (cStartDate) matchesDate = matchesDate && cDate >= cStartDate;
    if (cEndDate) matchesDate = matchesDate && cDate <= cEndDate;

    // Delivery Date
    const dDate = s.deliveryDate ? new Date(s.deliveryDate) : null;
    const dStartDate = filterShipmentDeliveryDateStart ? new Date(filterShipmentDeliveryDateStart) : null;
    const dEndDate = filterShipmentDeliveryDateEnd ? new Date(filterShipmentDeliveryDateEnd) : null;
    let matchesDeliveryDate = true;
    if (dDate) {
        if (dStartDate) matchesDeliveryDate = matchesDeliveryDate && dDate >= dStartDate;
        if (dEndDate) matchesDeliveryDate = matchesDeliveryDate && dDate <= dEndDate;
    } else if (dStartDate || dEndDate) {
        matchesDeliveryDate = false; 
    }

    // Approval Date
    let matchesApprovalDate = true;
    const aStartDate = filterShipmentApprovalDateStart ? new Date(filterShipmentApprovalDateStart) : null;
    const aEndDate = filterShipmentApprovalDateEnd ? new Date(filterShipmentApprovalDateEnd) : null;
    if (s.completedTime) {
          const [datePart] = s.completedTime.split(' ');
          const [d, m, y] = datePart.split('/');
          const aDate = new Date(`${y}-${m}-${d}`);
          if (aStartDate) matchesApprovalDate = matchesApprovalDate && aDate >= aStartDate;
          if (aEndDate) matchesApprovalDate = matchesApprovalDate && aDate <= aEndDate;
    } else if (aStartDate || aEndDate) {
          matchesApprovalDate = false;
    }

    const matchesCustomer = filterShipmentCustomer ? (s.customerInfo.id === filterShipmentCustomer) : true;
    const matchesPreparedBy = filterShipmentPreparedBy ? s.footer?.preparedBy === filterShipmentPreparedBy : true;
    const matchesApprovedBy = filterShipmentApprovedBy ? s.footer?.approvedBy === filterShipmentApprovedBy : true;

    return matchesSearch && matchesStatus && matchesDate && matchesDeliveryDate && matchesApprovalDate && matchesCustomer && matchesPreparedBy && matchesApprovedBy;
  });

  const uniqueShipmentCustomers = useMemo(() => {
      const map = new Map();
      shipments.forEach(s => {
          if (s.customerInfo.id && !map.has(s.customerInfo.id)) {
              map.set(s.customerInfo.id, s.customerInfo);
          }
      });
      return Array.from(map.values());
  }, [shipments]);
  
  const uniquePreparedBy = [...new Set(shipments.map(s => s.footer?.preparedBy).filter(Boolean))];
  const uniqueApprovedBy = [...new Set(shipments.map(s => s.footer?.approvedBy).filter(Boolean))];

  // --- CRUD Operations & Handlers ---

  const saveCustomer = () => {
    if (currentEditCustomer) {
      setCustomers(p => p.map(c => c.id === currentEditCustomer.id ? customerFormData : c));
    } else {
      if (customers.some(c => c.id === customerFormData.id)) { alert('ID already exists'); return; }
      setCustomers(p => [...p, customerFormData]);
    }
    setIsCustomerModalOpen(false);
    setCustomerFormData({ id: '', shortName: '', name: '', contact: '', phone: '', email: '' });
    setCurrentEditCustomer(null);
  };

  const deleteCustomer = (id) => {
    if (confirm('Delete this customer?')) setCustomers(p => p.filter(c => c.id !== id));
  };

  const createNewShipment = () => {
    const listMax = shipments.reduce((max, s) => {
        const base = parseInt(s.pickOrderNo.split('-')[0], 10);
        return isNaN(base) ? max : Math.max(max, base);
    }, 0);
    const sequenceKey = getStorageKey(currentCompany.id, 'max_pick_order_no');
    const histMax = parseInt(localStorage.getItem(sequenceKey) || '230000', 10);
    const nextNo = Math.max(listMax, histMax) + 1;
    localStorage.setItem(sequenceKey, nextNo.toString());

    const now = formatDateTime();
    setActiveShipment({
        id: nextNo.toString(),
        pickOrderNo: nextNo.toString(),
        createDate: new Date().toISOString().split('T')[0],
        createTime: now,
        lastModified: now,
        deliveryDate: '',
        status: 'draft',
        customerInfo: { id: '', name: '', shortName: '', service: '', shipmentType: 'Local' },
        remarks: '', items: [],
        packingInfo: [], 
        footer: { preparedBy: currentUser.name, approvedBy: '', picker: '', packer: '', dcData: '', label: '' }
    });
    setCurrentView('create-shipment');
  };

  const addItemToShipment = (summaryItem) => {
    const usedQty = activeShipment.items.filter(i => i.name === summaryItem.name).reduce((acc, i) => acc + Number(i.quantity), 0);
    const available = summaryItem.total - usedQty;
    if (available <= 0) { alert('Insufficient Stock'); return; }
    
    let reqStr = prompt(`Please enter quantity for ${summaryItem.name} (Available: ${available}):`, "1");
    if (reqStr === null) return;
    let req = parseInt(reqStr, 10);
    if (isNaN(req) || req <= 0) { alert('Invalid Quantity'); return; }
    if (req > available) { if (!confirm(`Insufficient stock (Remaining ${available}), add remaining only?`)) return; req = available; }
    
    const candidates = inventory.filter(i => i.name === summaryItem.name && i.quantity > 0)
        .sort((a, b) => (a.dc||'').localeCompare(b.dc||'', undefined, {numeric:true}) || (a.lot||'').localeCompare(b.lot||'', undefined, {numeric:true}));
    
    const draftMap = {};
    activeShipment.items.forEach(i => { if(i.inventoryId) draftMap[i.inventoryId] = (draftMap[i.inventoryId] || 0) + i.quantity; });

    let needed = req;
    let newItems = [];
    for (const batch of candidates) {
        if (needed <= 0) break;
        const batchAvail = batch.quantity - (draftMap[batch.id] || 0);
        if (batchAvail <= 0) continue;
        const take = Math.min(needed, batchAvail);
        newItems.push({
            inventoryId: batch.id, name: batch.name, brand: batch.brand||'',
            bin: batch.bin||'', coo: batch.origin||'', dc: batch.dc||'', lot: batch.lot||'', sn: '',
            quantity: take, maxQuantity: batch.quantity, remarks: ''
        });
        needed -= take;
    }

    if (needed > 0) alert(`Warning: Added only ${req - needed} (Some batches are occupied)`);

    if (newItems.length > 0) {
        setActiveShipment(prev => {
            const updatedItems = [...prev.items];
            const isFirstItem = prev.items.length === 0;
            let rowsToAdd = 0;
            newItems.forEach((_, idx) => {
                if (isFirstItem && idx === 0) rowsToAdd += 5;
                else rowsToAdd += 3;
            });
            const newRows = Array(rowsToAdd).fill(null).map(() => ({ cn: '', qty: '', dim: '', nw: '', gw: '' }));
            return {
                ...prev,
                items: [...updatedItems, ...newItems],
                packingInfo: [...prev.packingInfo, ...newRows]
            };
        });
    }
  };

  const saveShipmentDraft = () => {
    const idx = shipments.findIndex(s => s.id === activeShipment.id);
    const now = formatDateTime();
    const updatedShipment = { ...activeShipment, lastModified: now };
    const nextShips = [...shipments];
    if (idx >= 0) nextShips[idx] = updatedShipment; else nextShips.unshift(updatedShipment);
    setShipments(nextShips);
    setCurrentView('shipments');
  };

  const confirmShipment = () => {
    if (!confirm('Confirm shipment and deduct inventory? This cannot be undone.')) return;
    
    let nextInv = [...inventory];
    let nextShips = [...shipments];

    // Handle revisions (cancel old)
    if (activeShipment.pickOrderNo.includes('-')) {
        const base = activeShipment.pickOrderNo.split('-')[0];
        const prevNo = activeShipment.pickOrderNo.split('-')[1] === '2' ? base : `${base}-${parseInt(activeShipment.pickOrderNo.split('-')[1]) - 1}`;
        const prevIdx = nextShips.findIndex(s => s.pickOrderNo === prevNo && s.status === 'completed');
        if (prevIdx >= 0) {
            const prevShip = nextShips[prevIdx];
            prevShip.items.forEach(item => {
                let invIdx = -1;
                if (item.inventoryId) invIdx = nextInv.findIndex(i => i.id === item.inventoryId);
                else invIdx = nextInv.findIndex(i => i.name === item.name && i.dc === item.dc && i.lot === item.lot);
                if (invIdx >= 0) nextInv[invIdx].quantity += item.quantity;
                else nextInv.push({ id: Date.now()+Math.random(), name:item.name, brand:item.brand, origin:item.coo, dc:item.dc, lot:item.lot, quantity:item.quantity });
            });
            nextShips[prevIdx] = { ...prevShip, status: 'cancelled', remarks: `${prevShip.remarks} [Cancelled]`, lastModified: formatDateTime() };
        }
    }

    // Deduct Inventory
    for (const item of activeShipment.items) {
        let invIdx = -1;
        if (item.inventoryId) invIdx = nextInv.findIndex(i => i.id === item.inventoryId);
        else invIdx = nextInv.findIndex(i => i.name === item.name && i.dc === item.dc && i.lot === item.lot);

        if (invIdx === -1 || nextInv[invIdx].quantity < item.quantity) {
            alert(`Stock Error: ${item.name} (DC:${item.dc} Lot:${item.lot})`);
            return;
        }
        nextInv[invIdx].quantity -= item.quantity;
    }

    setInventory(nextInv);
    const now = formatDateTime();
    
    // Auto-fill approvedBy if not set, or leave for manual process
    const completed = { 
        ...activeShipment, 
        status: 'completed', 
        lastModified: now, 
        completedTime: now,
        footer: { ...activeShipment.footer, approvedBy: currentUser.name }
    };
    
    const shipIdx = nextShips.findIndex(s => s.id === activeShipment.id);
    if (shipIdx >= 0) nextShips[shipIdx] = completed; else nextShips.unshift(completed);
    
    setShipments(nextShips);
    alert('Shipment Confirmed!');
    setCurrentView('shipments');
  };

  const deleteShipment = (shipmentId) => {
    const targetShipment = shipments.find(s => s.id === shipmentId);
    if (!targetShipment) return;

    if (targetShipment.status === 'completed') {
        if (!window.confirm('Are you sure to delete this COMPLETED shipment?\nNote: This will automatically RESTOCK the inventory.')) return;

        let newInventory = [...inventory];
        targetShipment.items.forEach(item => {
            let invIndex = -1;
            if (item.inventoryId) invIndex = newInventory.findIndex(i => i.id === item.inventoryId);
            else invIndex = newInventory.findIndex(i => i.name === item.name && i.dc === item.dc && i.lot === item.lot);
            
            if (invIndex !== -1) newInventory[invIndex].quantity += item.quantity;
            else newInventory.push({ id: Date.now()+Math.random(), name:item.name, brand:item.brand, origin:item.coo, dc:item.dc, lot:item.lot, quantity:item.quantity });
        });
        setInventory(newInventory);
        
        const now = formatDateTime();
        const updatedShipments = shipments.map(s => {
            if (s.id === shipmentId) {
                return { ...s, status: 'cancelled', remarks: s.remarks ? `${s.remarks} [Cancelled]` : '[Cancelled]', lastModified: now };
            }
            return s;
        });
        setShipments(updatedShipments);
        alert('Shipment cancelled, inventory restocked.');
        if (activeShipment && activeShipment.id === shipmentId) {
             setActiveShipment(updatedShipments.find(s => s.id === shipmentId));
        }
    } else {
        if (!window.confirm('Are you sure to permanently delete this record?')) return;
        setShipments(prev => prev.filter(s => s.id !== shipmentId));
        if (activeShipment && activeShipment.id === shipmentId) {
            setCurrentView('shipments');
            setActiveShipment(null);
        }
    }
  };

  // --- Excel Handlers ---
  const handleExportExcel = () => {
      if (!XLSX) return;
      // Order: Brand -> Part No -> Origin -> DC -> LOT# -> Qty -> Bin
      const data = inventory.map(item => ({ 'Brand': item.brand, 'Part No': item.name, 'COO': item.origin, 'DC': item.dc, 'LOT#': item.lot, 'Qty': item.quantity, 'Bin': item.bin }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inventory List");
      XLSX.writeFile(wb, `${currentCompany.name}_Inventory_List_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportCustomers = () => {
      if (!XLSX) return;
      const data = customers.map(c => ({ 'Customer ID': c.id, 'Short Name': c.shortName, 'Customer Name': c.name, 'Contact': c.contact, 'Phone': c.phone, 'Email': c.email }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Customer List");
      XLSX.writeFile(wb, `${currentCompany.name}_Customer_List_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportShipments = () => {
      if (!XLSX) return;
      const data = [];
      shipments.forEach(s => {
          const base = {
              'Pick Order No': s.pickOrderNo,
              'Status': s.status,
              'Create Date': s.createDate,
              'Delivery Date': s.deliveryDate,
              'Customer ID': s.customerInfo.id,
              'Customer Name': s.customerInfo.name,
              'Prepared By': s.footer?.preparedBy || '',
              'Approved By': s.footer?.approvedBy || '',
              'Completed Time': s.completedTime || ''
          };
          if (s.items && s.items.length > 0) {
              s.items.forEach(item => {
                  data.push({
                      ...base,
                      'Part No': item.name,
                      'Brand': item.brand,
                      'COO': item.coo,
                      'DC': item.dc,
                      'Lot': item.lot,
                      'Qty': item.quantity,
                      'Bin': item.bin
                  });
              });
          } else {
              data.push(base);
          }
      });
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Shipment List");
      XLSX.writeFile(wb, `${currentCompany.name}_Shipment_List_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const triggerImport = () => fileInputRef.current.click();
  const triggerCustomerImport = () => customerFileInputRef.current.click();

  const handleImportExcel = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
          try {
              const wb = XLSX.read(evt.target.result, { type: 'binary' });
              const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
              const items = data.map((item, i) => ({
                  id: Date.now() + i + Math.random(),
                  name: String(item['Part No'] || item['PartNo'] || item['name'] || 'Unnamed').trim(),
                  brand: String(item['Brand'] || item['brand'] || '').trim(),
                  origin: String(item['COO'] || item['Origin'] || item['origin'] || '').trim(),
                  dc: String(item['DC'] || item['dc'] || '').trim(),
                  lot: String(item['LOT#'] || item['LOT'] || item['lot'] || '').trim(),
                  bin: String(item['Bin'] || item['bin'] || '').trim(),
                  quantity: Number(item['Qty'] || item['quantity'] || 0)
              })).filter(i => i.name !== 'Unnamed' && i.quantity > 0);
              
              if (!items.length) { alert('No valid data found'); return; }
              if (!confirm(`Import ${items.length} items?`)) return;

              setInventory(prev => {
                  const newInv = [...prev];
                  items.forEach(newItem => {
                      const idx = newInv.findIndex(i => i.name === newItem.name && i.dc === newItem.dc && i.lot === newItem.lot);
                      if (idx >= 0) newInv[idx].quantity += newItem.quantity;
                      else newInv.push(newItem);
                  });
                  alert('Import Complete!');
                  return newInv;
              });
          } catch { alert('Read Failed'); } finally { e.target.value = ''; }
      };
      reader.readAsBinaryString(file);
  };

  const handleImportCustomers = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
          try {
              const wb = XLSX.read(evt.target.result, { type: 'binary' });
              const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
              const items = data.map(item => ({
                  id: String(item['Customer ID'] || item['id'] || '').trim(),
                  shortName: String(item['Short Name'] || item['shortName'] || '').trim(),
                  name: String(item['Customer Name'] || item['name'] || '').trim(),
                  contact: String(item['Contact'] || item['contact'] || '').trim(),
                  phone: String(item['Phone'] || item['phone'] || '').trim(),
                  email: String(item['Email'] || item['email'] || '').trim()
              })).filter(i => i.id && i.name);

              if (!items.length) { alert('No valid customer data found'); return; }
              if (!confirm(`Prepare to import ${items.length} customers to ${currentCompany.name}, continue?`)) return;

              setCustomers(prev => {
                  const newCust = [...prev];
                  let added = 0;
                  items.forEach(newItem => {
                      if (!newCust.some(c => c.id === newItem.id)) newCust.push(newItem);
                  });
                  alert('Import Complete!');
                  return newCust;
              });
          } catch { alert('Read Failed'); } finally { e.target.value = ''; }
      };
      reader.readAsBinaryString(e.target.files[0]);
  };

  // --- Preview Component ---
  const PickingListPreview = ({ data, readOnly = false }) => (
      <div className="bg-white p-8 max-w-[210mm] mx-auto border border-gray-200 shadow-lg print:shadow-none print:border-0 text-black print:w-full print:max-w-none picking-list-container flex flex-col">
          <div className="flex justify-between items-start mb-6">
              <div>
                  <h1 className="text-2xl font-bold mb-1">Picking List</h1>
                  <h2 className="text-lg text-green-700 font-semibold mb-2">{currentCompany.fullName}</h2>
                  <div className="grid grid-cols-[120px_1fr] gap-y-1 text-sm">
                      <span className="text-gray-600 whitespace-nowrap">Customer ID:</span>
                      <div className="flex items-center">
                         {readOnly ? <span>{data.customerInfo.id}</span> : <input className="border-b border-gray-300 outline-none px-1 w-32" value={data.customerInfo.id} onChange={e => updateShipmentField('customerInfo', e.target.value, 'id')} placeholder="CUST..." />}
                         <div className="ml-1"><Barcode value={data.customerInfo.id} options={{ height: 20, width: 1, margin: 0, displayValue: false }} /></div>
                      </div>
                      <span className="text-gray-600 whitespace-nowrap">Customer Name:</span>{readOnly ? <span>{data.customerInfo.name}</span> : <input className="border-b border-gray-300 outline-none px-1 w-full" value={data.customerInfo.name} onChange={e => updateShipmentField('customerInfo', e.target.value, 'name')} placeholder="Customer Name" />}
                      <span className="text-gray-600 whitespace-nowrap">Remarks:</span>{readOnly ? <span>{data.remarks}</span> : <input className="border-b border-gray-300 outline-none px-1 w-full" value={data.remarks} onChange={e => updateShipmentField('remarks', e.target.value)} />}
                  </div>
              </div>
              <div className="text-right">
                  <div className="text-4xl font-serif mb-1 text-gray-600">
                      {readOnly ? (data.customerInfo.shortName || '') : <input className="border-b border-gray-300 outline-none px-1 w-full text-right placeholder-gray-200" value={data.customerInfo.shortName || ''} onChange={e => updateShipmentField('customerInfo', e.target.value, 'shortName')} placeholder="Short Name" />}
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-y-1 text-sm text-left">
                      <span className="text-gray-600 whitespace-nowrap">Pick Order No:</span>
                      <div className="flex items-center justify-between"><span className="font-bold">{data.pickOrderNo}</span><div className="ml-2"><Barcode value={data.pickOrderNo} options={{ height: 25, width: 1, displayValue: false, margin: 0 }} /></div></div>
                      
                      <span className="text-gray-600 whitespace-nowrap">Create Date:</span><span>{formatDate(data.createDate)}</span>
                      <span className="text-gray-600 whitespace-nowrap">Delivery Date:</span>
                      {readOnly ? <span>{formatDate(data.deliveryDate)}</span> : (
                          <div className="relative inline-block w-full">
                              <span className="hidden print-only">{formatDate(data.deliveryDate)}</span>
                              <input type="date" className="border-b border-gray-300 outline-none px-1 w-full no-print" value={data.deliveryDate} onChange={e => updateShipmentField('deliveryDate', e.target.value)} />
                          </div>
                      )}
                      <span className="text-gray-600 whitespace-nowrap">Customer Service:</span>{readOnly ? <span>{data.customerInfo.service}</span> : <input className="border-b border-gray-300 outline-none px-1 w-24" value={data.customerInfo.service} onChange={e => updateShipmentField('customerInfo', e.target.value, 'service')} />}
                      <span className="text-gray-600 whitespace-nowrap">Shipment Type:</span>
                      <div className="relative inline-block w-full">
                          <span className="hidden print:block">{data.customerInfo.shipmentType}</span>
                          <select className="border-b border-gray-300 outline-none px-1 w-full bg-transparent print:hidden appearance-none" value={data.customerInfo.shipmentType} onChange={e => updateShipmentField('customerInfo', e.target.value, 'shipmentType')} disabled={readOnly}>
                              <option value="Local">Local</option>
                              <option value="Export">Export</option>
                          </select>
                      </div>
                  </div>
              </div>
          </div>
          <div className="flex-1">
              <div className="border-t-2 border-gray-800 pt-4 space-y-6 min-h-[200px]">
                  {data.items.length === 0 && <div className="text-center text-gray-400 py-10">No Items (Add from Inventory on right)</div>}
                  {data.items.map((item, index) => (
                      <div key={index} className="border-b border-gray-300 pb-2 mb-2">
                          <div className="flex justify-between items-baseline mb-1">
                              <div className="flex gap-2 items-baseline">
                                  <span className="font-bold text-sm w-16 text-gray-600">Part No:</span>
                                  <span className="font-bold text-base">{item.name}</span>
                                  {!readOnly && (<button onClick={() => removeShipmentItem(index)} className="text-red-500 text-xs print:hidden ml-2 px-1 border border-red-200 rounded hover:bg-red-50">Remove</button>)}
                              </div>
                              <div className="text-sm"><span className="text-gray-500 mr-1">Line:</span>{index + 1}</div>
                          </div>
                          <div className="ml-16 mb-2"><Barcode value={item.name} options={{ height: 25, width: 1, displayValue: false, margin: 0 }} /></div>
                          <div className="grid grid-cols-12 gap-2 text-sm items-end">
                              <div className="col-span-6"></div> 
                              <div className="col-span-6 flex items-center"><span className="text-gray-500 mr-2 whitespace-nowrap">Remarks:</span><input className="w-full bg-transparent border-b border-gray-300 focus:border-indigo-500 outline-none print:border-none" value={item.remarks || ''} onChange={e => updateShipmentItem(index, 'remarks', e.target.value)} readOnly={readOnly} /></div>
                              <div className="col-span-4 flex items-center"><span className="text-gray-500 mr-2">Brand:</span><input className="w-full bg-transparent border-b border-gray-300 focus:border-indigo-500 outline-none print:border-none" value={item.brand || ''} onChange={e => updateShipmentItem(index, 'brand', e.target.value)} readOnly={readOnly} /></div>
                              <div className="col-span-4 flex items-center"><span className="text-gray-500 mr-2">Bin:</span><input className="w-full bg-transparent border-b border-gray-300 focus:border-indigo-500 outline-none print:border-none" value={item.bin || ''} onChange={e => updateShipmentItem(index, 'bin', e.target.value)} readOnly={readOnly} placeholder="" /></div>
                              <div className="col-span-4 flex items-center"><span className="text-gray-500 mr-2">COO:</span>{readOnly ? <span className="font-medium">{item.coo}</span> : <input className="w-full bg-transparent border-b border-gray-300 focus:border-indigo-500 outline-none print:border-none" value={item.coo || ''} onChange={e => updateShipmentItem(index, 'coo', e.target.value)} />}</div>
                              <div className="col-span-4 flex items-center"><span className="text-gray-500 mr-2">DC:</span><input className="w-full bg-transparent border-b border-gray-300 focus:border-indigo-500 outline-none print:border-none" value={item.dc || ''} onChange={e => updateShipmentItem(index, 'dc', e.target.value)} readOnly={readOnly} /></div>
                              <div className="col-span-4 flex items-center"><span className="text-gray-500 mr-2 whitespace-nowrap">LOT NO:</span><input className="w-full bg-transparent border-b border-gray-300 focus:border-indigo-500 outline-none print:border-none" value={item.lot || ''} onChange={e => updateShipmentItem(index, 'lot', e.target.value)} readOnly={readOnly} /></div>
                              <div className="col-span-2 flex items-center"><span className="text-gray-500 mr-2">S/N:</span><input className="w-full bg-transparent border-b border-gray-300 focus:border-indigo-500 outline-none print:border-none" value={item.sn || ''} onChange={e => updateShipmentItem(index, 'sn', e.target.value)} readOnly={readOnly} /></div>
                              <div className="col-span-2 text-right flex items-center justify-end">
                                  <span className="text-gray-500 mr-2">Qty:</span>
                                  {readOnly ? (<span className="font-bold text-lg">{item.quantity}</span>) : (
                                      <div className="flex items-center gap-1"><input type="number" className="w-16 text-right font-bold border-b border-gray-300 focus:border-indigo-500 outline-none print:border-none bg-transparent" value={item.quantity} onChange={e => updateShipmentItem(index, 'quantity', e.target.value)} min="1" /><span className="text-xs text-gray-400 print:hidden">/{item.maxQuantity}</span></div>
                                  )}
                                  <span className="ml-1 text-xs font-medium">EA</span>
                              </div>
                          </div>
                      </div>
                  ))}
                  <div className="flex justify-between items-center border-t-2 border-gray-800 pt-1 font-bold text-sm"><span>Total Carton(s):</span><div className="flex gap-8"><span>Total Qty:</span><span>{data.items.reduce((acc, item) => acc + Number(item.quantity), 0).toLocaleString()} EA</span></div></div>
              </div>
              <div className="mt-4 border-t-2 border-gray-800 pt-2">
                  <h3 className="text-sm font-bold mb-1 uppercase">Packing Information</h3>
                  <div className="border-t border-black mt-1 mb-2"></div>
                  <table className="w-full border-collapse border border-black text-sm">
                      <thead><tr><th className="border border-black p-1 w-16">C/N</th><th className="border border-black p-1 w-16">QTY</th><th className="border border-black p-1">DIMENSIONS</th><th className="border border-black p-1 w-20">N.W.(KG)</th><th className="border border-black p-1 w-20">G.W.(KG)</th></tr></thead>
                      <tbody>
                          {data.packingInfo.length === 0 ? (
                              <tr><td colSpan="5" className="border border-black p-2 text-center text-gray-400">No Packing Data</td></tr>
                          ) : (
                              data.packingInfo.map((row, idx) => (
                                  <tr key={idx} className="h-8">
                                      <td className="border border-black p-1 text-center">{readOnly ? row.cn : <input className="w-full text-center outline-none" value={row.cn} onChange={e => updatePackingInfo(idx, 'cn', e.target.value)} />}</td>
                                      <td className="border border-black p-1 text-center">{readOnly ? row.qty : <input className="w-full text-center outline-none" value={row.qty} onChange={e => updatePackingInfo(idx, 'qty', e.target.value)} />}</td><td className="border border-black p-1 text-center">{readOnly ? row.dim : <input className="w-full text-center outline-none" value={row.dim} onChange={e => updatePackingInfo(idx, 'dim', e.target.value)} />}</td><td className="border border-black p-1 text-center">{readOnly ? row.nw : <input className="w-full text-center outline-none" value={row.nw} onChange={e => updatePackingInfo(idx, 'nw', e.target.value)} />}</td><td className="border border-black p-1 text-center">{readOnly ? row.gw : <input className="w-full text-center outline-none" value={row.gw} onChange={e => updatePackingInfo(idx, 'gw', e.target.value)} />}</td>
                                  </tr>
                              ))
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
          <div className="mt-auto">
              <div className="grid grid-cols-4 gap-4 text-xs">
                  <div>Picker: {readOnly ? <span className="ml-2">{data.footer.picker}</span> : <input className="border-b w-20 ml-1" value={data.footer.picker} onChange={e => updateShipmentField('footer', e.target.value, 'picker')} />}</div>
                  <div>Packer: {readOnly ? <span className="ml-2">{data.footer.packer}</span> : <input className="border-b w-20 ml-1" value={data.footer.packer} onChange={e => updateShipmentField('footer', e.target.value, 'packer')} />}</div>
                  <div>DC Data: {readOnly ? <span className="ml-2">{data.footer.dcData}</span> : <input className="border-b w-20 ml-1" value={data.footer.dcData} onChange={e => updateShipmentField('footer', e.target.value, 'dcData')} />}</div>
                  <div className="whitespace-nowrap">Label: {readOnly ? <span className="ml-2">{data.footer.label}</span> : <input className="border-b w-20 ml-1" value={data.footer.label} onChange={e => updateShipmentField('footer', e.target.value, 'label')} />}</div>
              </div>
          </div>
      </div>
  );

  // --- Main Render ---
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-md w-96">
          <div className="flex justify-center mb-6">
            <div className="bg-indigo-600 p-3 rounded-xl">
              <Package className="text-white" size={32} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">Inventory Management System</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
              <div className="relative">
                <Building className="absolute left-3 top-2.5 text-slate-400" size={20} />
                <select 
                  className="w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white appearance-none"
                  value={loginData.companyId}
                  onChange={e => setLoginData({...loginData, companyId: e.target.value})}
                >
                  {COMPANIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" size={20} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 text-slate-400" size={20} />
                <input 
                  type="text" 
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Enter username"
                  value={loginData.username}
                  onChange={e => setLoginData({...loginData, username: e.target.value})}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 text-slate-400" size={20} />
                <input 
                  type="password" 
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Enter password"
                  value={loginData.password}
                  onChange={e => setLoginData({...loginData, password: e.target.value})}
                />
              </div>
            </div>
            {loginError && <div className="text-red-500 text-sm text-center">{loginError}</div>}
            <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors font-bold">Login</button>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-lg text-xs text-gray-500 border border-gray-200">
              <div className="font-bold mb-2">Test Accounts:</div>
              <div className="flex justify-between mb-1"><span>Admin:</span><span>admin / 888888</span></div>
              <div className="flex justify-between mb-1"><span>Manager:</span><span>manager / 888888</span></div>
              <div className="flex justify-between mb-1"><span>Operator:</span><span>op / 123456</span></div>
              <div className="flex justify-between"><span>Viewer:</span><span>guest / 000000</span></div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 print:bg-white">
      {/* 隱藏的檔案上傳 Input */}
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleImportExcel}
        accept=".xlsx, .xls"
        className="hidden"
      />
      <input 
        type="file" 
        ref={customerFileInputRef}
        onChange={handleImportCustomers}
        accept=".xlsx, .xls"
        className="hidden"
      />

      {/* 頂部導航 (列印時隱藏) */}
      <nav className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10 no-print">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <Package className="text-white" size={24} />
              </div>
              <h1 className="text-xl font-bold text-slate-800 hidden sm:block">{currentCompany.name} Inventory Management</h1>
            </div>
            
            {/* View Switcher */}
            <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
              <button 
                onClick={() => setCurrentView('inventory')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${currentView === 'inventory' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Package size={16} />
                Inventory List
              </button>
              <button 
                onClick={() => setCurrentView('summary')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${currentView === 'summary' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <BarChart size={16} />
                Inventory Summary
              </button>
              <button 
                onClick={() => setCurrentView('customers')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${currentView === 'customers' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Users size={16} />
                Customer Management
              </button>
              <button 
                onClick={() => setCurrentView('shipments')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${currentView === 'shipments' || currentView === 'create-shipment' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Truck size={16} />
                Shipment Management
              </button>
              {(currentUser.role === 'admin' || currentUser.role === 'developer') && (
                <button 
                  onClick={() => setCurrentView('users')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${currentView === 'users' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <User size={16} />
                  User Management
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 rounded-full">
              <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
              <span className="text-xs font-medium text-indigo-700">{currentUser.name} ({ROLES[currentUser.role].label})</span>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-2 text-slate-500 hover:text-red-600 transition-colors text-sm font-medium"><LogOut size={18} /> Logout</button>
          </div>
        </div>
      </nav>

      {/* 主要內容區 */}
      <main className="max-w-7xl mx-auto px-4 py-8 print:p-0 print:w-full">
        {/* Inventory View */}
        {currentView === 'inventory' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:border-0 print:shadow-none">
                <div className="p-5 border-b border-slate-100 space-y-4 no-print">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold text-slate-800">Inventory List</h2>
                        <div className="flex items-center gap-3">
                            {hasPermission('export') && (
                                <button onClick={handleExportExcel} disabled={!isExcelReady} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 text-sm text-slate-600"><Download size={18} /> Export</button>
                            )}
                            {hasPermission('import') && (
                                <button onClick={triggerImport} disabled={!isExcelReady} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 text-sm text-slate-600"><Upload size={18} /> Import</button>
                            )}
                            {hasPermission('add') && (
                                <button onClick={() => { setCurrentEditItem(null); setFormData({name:'', bin: '', origin:'', brand:'', dc:'', lot:'', quantity:0}); setIsModalOpen(true); }} className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm whitespace-nowrap"><Plus size={20} /> Add Item</button>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                        <div className="flex-1 flex flex-col sm:flex-row gap-3 min-w-0">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
                                <input type="text" placeholder="Search Part No, DC or LOT#..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <button onClick={() => setShowFilters(!showFilters)} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border bg-white hover:bg-slate-50"><Filter size={18} /> Filter</button>
                        </div>
                    </div>
                    {showFilters && (
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex flex-wrap items-end gap-4">
                            <div><label className="block text-xs font-semibold text-slate-500 mb-1">Brand</label><select value={filterBrand} onChange={e => setFilterBrand(e.target.value)} className="w-32 px-3 py-2 border rounded-lg bg-white"><option value="">All</option>{uniqueBrands.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
                            {/* Removed Model Filter */}
                            <div><label className="block text-xs font-semibold text-slate-500 mb-1">Part No</label><select value={filterPartNo} onChange={e => setFilterPartNo(e.target.value)} className="w-32 px-3 py-2 border rounded-lg bg-white"><option value="">All</option>{uniquePartNos.map(n => <option key={n} value={n}>{n}</option>)}</select></div>
                            {/* Renamed Origin to COO */}
                            <div><label className="block text-xs font-semibold text-slate-500 mb-1">COO</label><select value={filterOrigin} onChange={e => setFilterOrigin(e.target.value)} className="w-32 px-3 py-2 border rounded-lg bg-white"><option value="">All</option>{uniqueOrigins.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                            <div><label className="block text-xs font-semibold text-slate-500 mb-1">DC</label><select value={filterDC} onChange={e => setFilterDC(e.target.value)} className="w-32 px-3 py-2 border rounded-lg bg-white"><option value="">All</option>{uniqueDCs.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                            <div><label className="block text-xs font-semibold text-slate-500 mb-1">LOT#</label><select value={filterLot} onChange={e => setFilterLot(e.target.value)} className="w-32 px-3 py-2 border rounded-lg bg-white"><option value="">All</option>{uniqueLots.map(l => <option key={l} value={l}>{l}</option>)}</select></div>
                            <div><label className="block text-xs font-semibold text-slate-500 mb-1">Bin</label><select value={filterBin} onChange={e => setFilterBin(e.target.value)} className="w-32 px-3 py-2 border rounded-lg bg-white"><option value="">All</option>{uniqueBins.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
                            <div><label className="block text-xs font-semibold text-slate-500 mb-1">Status</label><select value={filterStock} onChange={e => setFilterStock(e.target.value)} className="w-32 px-3 py-2 border rounded-lg bg-white"><option value="all">All</option><option value="in_stock">In Stock</option><option value="out_of_stock">Out of Stock</option></select></div>
                            <button onClick={resetFilters} className="px-3 py-2 hover:bg-slate-200 rounded-lg flex items-center gap-1 text-sm"><RotateCcw size={14} /> Reset</button>
                        </div>
                    )}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead><tr className="bg-slate-50 text-slate-500 text-sm font-semibold"><th className="p-5 border-b">Brand</th><th className="p-5 border-b">Part No</th><th className="p-5 border-b">COO</th><th className="p-5 border-b">DC</th><th className="p-5 border-b">LOT#</th><th className="p-5 border-b text-center">Qty</th><th className="p-5 border-b">Bin</th><th className="p-5 border-b text-right no-print">Action</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">{filteredInventory.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50">
                                <td className="p-5 text-sm text-slate-600">{item.brand}</td>
                                {/* Removed Model */}
                                <td className="p-5 font-medium">{item.name}</td><td className="p-5 text-sm text-slate-600">{item.origin}</td><td className="p-5 text-sm font-mono text-slate-600">{item.dc}</td><td className="p-5 text-sm font-mono text-slate-600">{item.lot}</td>
                                <td className="p-5 text-center"><span className={`font-bold rounded px-2 py-1 ${item.quantity===0?'bg-red-100 text-red-600':'bg-slate-100 text-slate-700'}`}>{item.quantity}</span></td>
                                <td className="p-5 text-sm text-slate-600">{item.bin}</td>
                                <td className="p-5 text-right no-print"><div className="flex justify-end gap-2">
                                    {hasPermission('edit') && <button className="text-indigo-600 hover:bg-indigo-50 p-2 rounded" onClick={() => { setCurrentEditItem(item); setFormData(item); setIsModalOpen(true); }}><Edit size={18} /></button>}
                                    {hasPermission('delete') && <button className="text-red-600 hover:bg-red-50 p-2 rounded" onClick={() => { if(confirm('Confirm delete?')) setInventory(inventory.filter(i=>i.id!==item.id)); }}><Trash2 size={18} /></button>}
                                </div></td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div>
            </div>
        )}
        
        {/* Summary View */}
        {currentView === 'summary' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-100"><h2 className="text-lg font-bold text-slate-800">Inventory Summary</h2></div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-sm font-semibold">
                                <th className="p-5 border-b cursor-pointer hover:bg-slate-100" onClick={() => handleSummarySort('name')}>Part No <ArrowUpDown size={14} className="inline" /></th>
                                <th className="p-5 border-b text-center">Batch Count</th>
                                <th className="p-5 border-b text-center cursor-pointer hover:bg-slate-100" onClick={() => handleSummarySort('total')}>Total Quantity <ArrowUpDown size={14} className="inline" /></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {summaryData.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="p-5 font-medium">{item.name}</td>
                                    <td className="p-5 text-center text-sm text-slate-500">{item.count}</td>
                                    <td className="p-5 text-center"><span className="font-bold text-slate-800 bg-blue-50 px-3 py-1 rounded-full">{item.total.toLocaleString()}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
        
        {/* Customers View */}
        {currentView === 'customers' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-100 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold text-slate-800">Customer List</h2>
                        <div className="flex items-center gap-3">
                            {hasPermission('export') && (
                                <button onClick={handleExportCustomers} disabled={!isExcelReady} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 text-sm text-slate-600"><Download size={18} /> Export</button>
                            )}
                            {hasPermission('import') && (
                                <button onClick={triggerCustomerImport} disabled={!isExcelReady} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 text-sm text-slate-600"><Upload size={18} /> Import</button>
                            )}
                            {hasPermission('add') && (
                                <button onClick={() => { setCurrentEditCustomer(null); setCustomerFormData({ id: '', shortName: '', name: '', contact: '', phone: '', email: '' }); setIsCustomerModalOpen(true); }} className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm"><Plus size={20} /> Add Customer</button>
                            )}
                        </div>
                    </div>
                    
                    {/* 客戶搜尋欄 */}
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-4">
                        <div className="flex-1 flex flex-col sm:flex-row gap-3 min-w-0">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
                                <input type="text" placeholder="Search Customer ID, Customer Name, Short Name, Contact..." value={customerSearchTerm} onChange={(e) => setCustomerSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <button onClick={() => setShowCustomerFilters(!showCustomerFilters)} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border bg-white hover:bg-slate-50"><Filter size={18} /> Filter</button>
                        </div>
                    </div>
                    
                    {showCustomerFilters && (
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex flex-wrap items-end gap-4 mb-4">
                            <div><label className="block text-xs font-semibold text-slate-500 mb-1">Customer ID</label><select value={filterCustId} onChange={e => setFilterCustId(e.target.value)} className="w-32 px-3 py-2 border rounded-lg bg-white"><option value="">All</option>{uniqueCustIds.map(n => <option key={n} value={n}>{n}</option>)}</select></div>
                            <div><label className="block text-xs font-semibold text-slate-500 mb-1">Short Name</label><select value={filterCustShortName} onChange={e => setFilterCustShortName(e.target.value)} className="w-32 px-3 py-2 border rounded-lg bg-white"><option value="">All</option>{uniqueCustShortNames.map(n => <option key={n} value={n}>{n}</option>)}</select></div>
                            <div><label className="block text-xs font-semibold text-slate-500 mb-1">Customer Name</label><select value={filterCustName} onChange={e => setFilterCustName(e.target.value)} className="w-32 px-3 py-2 border rounded-lg bg-white"><option value="">All</option>{uniqueCustNames.map(n => <option key={n} value={n}>{n}</option>)}</select></div>
                            <div><label className="block text-xs font-semibold text-slate-500 mb-1">Contact</label><select value={filterCustContact} onChange={e => setFilterCustContact(e.target.value)} className="w-32 px-3 py-2 border rounded-lg bg-white"><option value="">All</option>{uniqueCustContacts.map(n => <option key={n} value={n}>{n}</option>)}</select></div>
                            <button onClick={resetCustomerFilters} className="px-3 py-2 hover:bg-slate-200 rounded-lg flex items-center gap-1 text-sm"><RotateCcw size={14} /> Reset</button>
                        </div>
                    )}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-sm font-semibold">
                                <th className="p-5 border-b">Customer ID</th><th className="p-5 border-b">Customer Name</th><th className="p-5 border-b">Short Name</th><th className="p-5 border-b">Contact</th><th className="p-5 border-b">Phone</th><th className="p-5 border-b">Email</th><th className="p-5 border-b text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">{filteredCustomers.map((cust, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                                <td className="p-5 font-mono text-indigo-600">{cust.id}</td><td className="p-5 font-medium">{cust.name}</td><td className="p-5 text-sm">{cust.shortName}</td><td className="p-5 text-sm">{cust.contact}</td><td className="p-5 text-sm">{cust.phone}</td><td className="p-5 text-sm">{cust.email}</td>
                                <td className="p-5 text-right"><div className="flex justify-end gap-2">
                                    {hasPermission('edit') && <button className="text-indigo-600 hover:bg-indigo-50 p-2 rounded" onClick={() => { setCurrentEditCustomer(cust); setCustomerFormData(cust); setIsCustomerModalOpen(true); }}><Edit size={18} /></button>}
                                    {hasPermission('delete') && <button className="text-red-600 hover:bg-red-50 p-2 rounded" onClick={() => deleteCustomer(cust.id)}><Trash2 size={18} /></button>}
                                </div></td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div>
            </div>
        )}

        {/* Shipments View */}
        {currentView === 'shipments' && (
            <div className="space-y-6">
                <div className="flex justify-between items-center no-print"><h2 className="text-2xl font-bold text-slate-800">Shipment Management</h2>
                    {hasPermission('manageShipments') && (
                        <button onClick={createNewShipment} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow-sm flex items-center gap-2"><Plus size={20} /> Create Pick Order</button>
                    )}
                </div>
                
                {/* Shipment Filter Panel */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 mb-4">
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                        <div className="flex-1 flex flex-col sm:flex-row gap-3 min-w-0">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
                                <input 
                                    type="text" 
                                    placeholder="Search Pick Order No, Customer Name..." 
                                    value={shipmentSearchTerm} 
                                    onChange={(e) => setShipmentSearchTerm(e.target.value)} 
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" 
                                />
                            </div>
                            <button onClick={() => setShowShipmentFilters(!showShipmentFilters)} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border bg-white hover:bg-slate-50"><Filter size={18} /> Filter</button>
                        </div>
                    </div>

                    {showShipmentFilters && (
                        <div className="pt-4 mt-4 border-t border-slate-100 flex flex-wrap items-end gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Status</label>
                                <select value={filterShipmentStatus} onChange={e => setFilterShipmentStatus(e.target.value)} className="w-32 px-3 py-2 border rounded-lg bg-white">
                                    <option value="all">All</option>
                                    <option value="draft">Draft</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Create Date</label>
                                <div className="flex items-center gap-2">
                                  <input type="date" value={filterShipmentDateStart} onChange={e => setFilterShipmentDateStart(e.target.value)} className="px-3 py-2 border rounded-lg bg-white" placeholder="From" />
                                  <span>-</span>
                                  <input type="date" value={filterShipmentDateEnd} onChange={e => setFilterShipmentDateEnd(e.target.value)} className="px-3 py-2 border rounded-lg bg-white" placeholder="To" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Delivery Date</label>
                                <div className="flex items-center gap-2">
                                    <input type="date" value={filterShipmentDeliveryDateStart} onChange={e => setFilterShipmentDeliveryDateStart(e.target.value)} className="px-3 py-2 border rounded-lg bg-white text-xs" placeholder="From" />
                                    <span>-</span>
                                    <input type="date" value={filterShipmentDeliveryDateEnd} onChange={e => setFilterShipmentDeliveryDateEnd(e.target.value)} className="px-3 py-2 border rounded-lg bg-white text-xs" placeholder="To" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Approval Date</label>
                                <div className="flex items-center gap-2">
                                    <input type="date" value={filterShipmentApprovalDateStart} onChange={e => setFilterShipmentApprovalDateStart(e.target.value)} className="px-3 py-2 border rounded-lg bg-white text-xs" placeholder="From" />
                                    <span>-</span>
                                    <input type="date" value={filterShipmentApprovalDateEnd} onChange={e => setFilterShipmentApprovalDateEnd(e.target.value)} className="px-3 py-2 border rounded-lg bg-white text-xs" placeholder="To" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Customer</label>
                                <select value={filterShipmentCustomer} onChange={e => setFilterShipmentCustomer(e.target.value)} className="w-40 px-3 py-2 border rounded-lg bg-white">
                                    <option value="">All Customers</option>
                                    {uniqueShipmentCustomers.map(c => <option key={c.id} value={c.id}>{c.shortName} - {c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Prepared By</label>
                                <select value={filterShipmentPreparedBy} onChange={e => setFilterShipmentPreparedBy(e.target.value)} className="w-32 px-3 py-2 border rounded-lg bg-white">
                                    <option value="">All</option>
                                    {uniquePreparedBy.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Approved By</label>
                                <select value={filterShipmentApprovedBy} onChange={e => setFilterShipmentApprovedBy(e.target.value)} className="w-32 px-3 py-2 border rounded-lg bg-white">
                                    <option value="">All</option>
                                    {uniqueApprovedBy.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            </div>
                            <button onClick={resetShipmentFilters} className="px-3 py-2 hover:bg-slate-200 rounded-lg flex items-center gap-1 text-sm"><RotateCcw size={14} /> Reset</button>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:border-0 print:shadow-none">
                    <table className="w-full text-left border-collapse">
                        <thead><tr className="bg-slate-50 text-slate-500 text-sm font-semibold"><th className="p-5 border-b">Pick Order No</th><th className="p-5 border-b">Create Date</th><th className="p-5 border-b">Delivery Date</th><th className="p-5 border-b">Customer</th><th className="p-5 border-b">Prepared By</th><th className="p-5 border-b">Approved By</th><th className="p-5 border-b">Approval Time</th><th className="p-5 border-b">Status</th><th className="p-5 border-b text-right no-print">Action</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">{filteredShipments.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50">
                                <td className="p-5 font-mono font-bold text-indigo-600">PO-{s.pickOrderNo}</td><td className="p-5 text-sm">{formatDate(s.createDate)}</td><td className="p-5 text-sm">{formatDate(s.deliveryDate)}</td><td className="p-5">{s.customerInfo.name||'-'}</td>
                                <td className="p-5 text-sm">{s.footer?.preparedBy || '-'}</td>
                                <td className="p-5 text-sm">{s.footer?.approvedBy || '-'}</td>
                                <td className="p-5 text-sm">{s.completedTime || '-'}</td>
                                <td className="p-5">{s.status==='completed'?<span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold"><CheckCircle size={12}/> Completed</span>:s.status==='cancelled'?<span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-bold"><Ban size={12}/> Cancelled</span>:<span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold"><Edit size={12}/> Draft</span>}</td>
                                <td className="p-5 text-right no-print"><div className="flex items-center justify-end gap-2">
                                    {s.status === 'draft' && hasPermission('delete') && (<button onClick={(e) => { e.stopPropagation(); deleteShipment(s.id); }} className="text-red-600 hover:bg-red-50 p-2 rounded" title="Delete Draft"><Trash2 size={18} /></button>)}
                                    {s.status === 'completed' && hasPermission('deleteCompleted') && (<button onClick={(e) => { e.stopPropagation(); deleteShipment(s.id); }} className="text-red-600 hover:bg-red-50 p-2 rounded" title="Delete Completed"><Trash2 size={18} /></button>)}
                                    {s.status === 'cancelled' && hasPermission('delete') && (<button onClick={(e) => { e.stopPropagation(); deleteShipment(s.id); }} className="text-red-600 hover:bg-red-50 p-2 rounded" title="Delete Permanently"><Trash2 size={18} /></button>)}
                                    <button onClick={()=>{setActiveShipment(s); setCurrentView('create-shipment');}} className="text-slate-600 hover:text-indigo-600 font-medium">{s.status==='draft' && hasPermission('manageShipments') ?'Edit':'View'}</button>
                                </div></td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div>
            </div>
        )}

        {/* Create/Edit Shipment & Modals ... (Keep as is) */}
        {currentView === 'create-shipment' && activeShipment && (
            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 items-start print:block">
                <div className="space-y-4 no-print">
                    <button onClick={() => setCurrentView('shipments')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-4"><ArrowLeft size={18} /> Back to List</button>
                    {/* ... Left Panel Controls ... */}
                    {activeShipment.status === 'draft' && hasPermission('manageShipments') && (
                    <>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Users size={18} /> Select Customer</h3><select className="w-full border p-2 rounded bg-slate-50 outline-none" onChange={handleSelectCustomer} defaultValue=""><option value="" disabled>-- Select Customer --</option>{customers.map(c => <option key={c.id} value={c.id}>{c.shortName ? `${c.shortName} - ` : ''}{c.name}</option>)}</select></div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Package size={18} /> Add Item</h3><div className="relative mb-3"><Search className="absolute left-3 top-2.5 text-slate-400" size={16} /><input className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-slate-50" placeholder="Search Inventory..." onChange={e => setSearchTerm(e.target.value)} /></div><div className="max-h-[300px] overflow-y-auto space-y-2">{summaryData.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()) && i.total > 0).map((item, idx) => (<div key={idx} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded border border-slate-100"><div className="overflow-hidden"><div className="text-sm font-medium truncate">{item.name}</div><div className="text-xs text-slate-500 font-bold text-blue-600">Total Stock: {item.total.toLocaleString()}</div></div><button onClick={() => addItemToShipment(item)} className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 p-1.5 rounded"><Plus size={16} /></button></div>))}</div></div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3"><h3 className="font-bold text-slate-800">Actions</h3><button onClick={saveShipmentDraft} className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-slate-700"><Save size={18} /> Save Draft</button>
                        {hasPermission('confirmShipment') && <button onClick={confirmShipment} className="w-full flex items-center justify-center gap-2 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-bold shadow-md"><CheckCircle size={18} /> Confirm Shipment</button>}
                        <button onClick={() => window.print()} className="w-full flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-900 rounded-lg text-white"><Printer size={18} /> Print Pick Order</button></div>
                    </>
                    )}
                    {activeShipment.status === 'completed' && (
                        <div className="bg-green-50 p-4 rounded-xl border border-green-200 text-green-800 mb-4">
                            <div className="flex items-center gap-2 font-bold mb-2"><CheckCircle size={20} /> Shipment Completed</div>
                            {/* 移除修訂按鈕 */}
                            {hasPermission('deleteCompleted') && <button onClick={() => deleteShipment(activeShipment.id)} className="mt-2 w-full flex items-center justify-center gap-2 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-bold shadow-sm"><Trash2 size={18} /> Delete Shipment</button>}
                            <button onClick={() => window.print()} className="mt-2 w-full flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-900 rounded-lg text-white"><Printer size={18} /> Print</button>
                        </div>
                    )}
                    {activeShipment.status === 'cancelled' && (
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-gray-800 mb-4">
                            <div className="flex items-center gap-2 font-bold mb-2"><Ban size={20} /> Shipment Cancelled</div>
                            <p className="text-sm mb-3">This shipment is archived and stock has been restored.</p>
                            {hasPermission('delete') && <button onClick={() => deleteShipment(activeShipment.id)} className="w-full flex items-center justify-center gap-2 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-bold shadow-sm"><Trash2 size={18} /> Delete Permanently</button>}
                        </div>
                    )}
                </div>
                <div><PickingListPreview data={activeShipment} readOnly={activeShipment.status !== 'draft' || !hasPermission('manageShipments')} /></div>
            </div>
        )}

        {/* Users Modal and Users View (Keep as is) */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm no-print">
                <div className="bg-white p-6 rounded-xl w-full max-w-md">
                    <h2 className="text-lg font-bold mb-4">{currentEditItem ? 'Edit Item' : 'Add Item'}</h2>
                    <div className="space-y-3">
                        <input className="w-full border p-2 rounded" placeholder="Part No" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                        {/* Removed Model Input */}
                        <div className="grid grid-cols-2 gap-2"><input className="border p-2 rounded" placeholder="Brand" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} /><input className="border p-2 rounded" placeholder="COO" value={formData.origin} onChange={e => setFormData({...formData, origin: e.target.value})} /></div>
                        <div className="grid grid-cols-2 gap-2"><input className="border p-2 rounded" placeholder="DC" value={formData.dc} onChange={e => setFormData({...formData, dc: e.target.value})} /><input className="border p-2 rounded" placeholder="LOT#" value={formData.lot} onChange={e => setFormData({...formData, lot: e.target.value})} /></div>
                        <div className="grid grid-cols-2 gap-2"><input type="number" className="border p-2 rounded" placeholder="Qty" value={formData.quantity} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} /><input className="border p-2 rounded" placeholder="Bin" value={formData.bin} onChange={e => setFormData({...formData, bin: e.target.value})} /></div>
                    </div>
                    <div className="flex gap-2 mt-4"><button onClick={() => setIsModalOpen(false)} className="flex-1 py-2 border rounded">Cancel</button><button onClick={() => { if(currentEditItem) setInventory(inventory.map(i => i.id === currentEditItem.id ? {...formData, id: i.id} : i)); else setInventory([...inventory, {...formData, id: Date.now()}]); setIsModalOpen(false); }} className="flex-1 py-2 bg-indigo-600 text-white rounded">Save</button></div>
                </div>
            </div>
        )}
        {isCustomerModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm no-print">
                <div className="bg-white p-6 rounded-xl w-full max-w-md">
                    <h2 className="text-lg font-bold mb-4">{currentEditCustomer ? 'Edit Customer' : 'Add Customer'}</h2>
                    <div className="space-y-3">
                        <input className="w-full border p-2 rounded" placeholder="Customer ID" value={customerFormData.id} onChange={e => setCustomerFormData({...customerFormData, id: e.target.value})} disabled={!!currentEditCustomer} />
                        <input className="w-full border p-2 rounded" placeholder="Customer Name" value={customerFormData.name} onChange={e => setCustomerFormData({...customerFormData, name: e.target.value})} />
                        <input className="w-full border p-2 rounded" placeholder="Short Name" value={customerFormData.shortName} onChange={e => setCustomerFormData({...customerFormData, shortName: e.target.value})} />
                        <input className="w-full border p-2 rounded" placeholder="Contact" value={customerFormData.contact} onChange={e => setCustomerFormData({...customerFormData, contact: e.target.value})} />
                        <input className="w-full border p-2 rounded" placeholder="Phone" value={customerFormData.phone} onChange={e => setCustomerFormData({...customerFormData, phone: e.target.value})} />
                        <input className="w-full border p-2 rounded" placeholder="Email" value={customerFormData.email} onChange={e => setCustomerFormData({...customerFormData, email: e.target.value})} />
                    </div>
                    <div className="flex gap-2 mt-4"><button onClick={() => setIsCustomerModalOpen(false)} className="flex-1 py-2 border rounded">Cancel</button><button onClick={saveCustomer} className="flex-1 py-2 bg-indigo-600 text-white rounded">Save</button></div>
                </div>
            </div>
        )}
        {isUserModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm no-print">
                <div className="bg-white p-6 rounded-xl w-full max-w-md">
                    <h2 className="text-lg font-bold mb-4">{currentEditUser ? 'Edit User' : 'Add User'}</h2>
                    <div className="space-y-3">
                        <input className="w-full border p-2 rounded" placeholder="Username" value={userFormData.username} onChange={e => setUserFormData({...userFormData, username: e.target.value})} />
                        <input className="w-full border p-2 rounded" placeholder="Password" value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} />
                        <input className="w-full border p-2 rounded" placeholder="Display Name" value={userFormData.name} onChange={e => setUserFormData({...userFormData, name: e.target.value})} />
                        <select className="w-full border p-2 rounded bg-white" value={userFormData.role} onChange={e => setUserFormData({...userFormData, role: e.target.value})}>
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                            <option value="operator">Operator</option>
                            <option value="viewer">Viewer</option>
                        </select>
                    </div>
                    <div className="flex gap-2 mt-4"><button onClick={() => setIsUserModalOpen(false)} className="flex-1 py-2 border rounded">Cancel</button><button onClick={saveUser} className="flex-1 py-2 bg-indigo-600 text-white rounded">Save</button></div>
                </div>
            </div>
        )}
        {currentView === 'users' && (currentUser.role === 'admin' || currentUser.role === 'developer') && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-slate-800">User Management</h2>
                    <button onClick={() => { setCurrentEditUser(null); setUserFormData({ username: '', password: '', name: '', role: 'operator' }); setIsUserModalOpen(true); }} className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm"><Plus size={20} /> Add User</button>
                </div>
                {/* Search Bar */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    <div className="flex-1 flex flex-col sm:flex-row gap-3 min-w-0">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
                            <input 
                                type="text" 
                                placeholder="Search Username or Name..." 
                                value={userSearchTerm} 
                                onChange={(e) => setUserSearchTerm(e.target.value)} 
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" 
                            />
                        </div>
                        <button onClick={() => setShowUserFilters(!showUserFilters)} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border bg-white hover:bg-slate-50"><Filter size={18} /> Filter</button>
                    </div>
                </div>
                
                {/* Filter Panel */}
                {showUserFilters && (
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex flex-wrap items-end gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Role</label>
                            <select value={filterUserRole} onChange={e => setFilterUserRole(e.target.value)} className="w-32 px-3 py-2 border rounded-lg bg-white">
                                <option value="all">All</option>
                                <option value="admin">Admin</option>
                                <option value="manager">Manager</option>
                                <option value="operator">Operator</option>
                                <option value="viewer">Viewer</option>
                            </select>
                        </div>
                        <button onClick={resetUserFilters} className="px-3 py-2 hover:bg-slate-200 rounded-lg flex items-center gap-1 text-sm"><RotateCcw size={14} /> Reset</button>
                    </div>
                )}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-sm font-semibold">
                                <th className="p-5 border-b">Username</th><th className="p-5 border-b">Name</th><th className="p-5 border-b">Role</th><th className="p-5 border-b text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.map(u => (
                                <tr key={u.id} className="hover:bg-slate-50">
                                    <td className="p-5 font-medium">{u.username}</td>
                                    <td className="p-5 text-sm">{u.name}</td>
                                    <td className="p-5"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : u.role === 'manager' ? 'bg-orange-100 text-orange-800' : u.role === 'operator' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{ROLES[u.role].label}</span></td>
                                    <td className="p-5 text-right"><div className="flex justify-end gap-2">
                                        <button className="text-indigo-600 hover:bg-indigo-50 p-2 rounded" onClick={() => { setCurrentEditUser(u); setUserFormData(u); setIsUserModalOpen(true); }}><Edit size={18} /></button>
                                        <button className={`p-2 rounded ${u.id === currentUser.id ? 'text-gray-300 cursor-not-allowed' : 'text-red-600 hover:bg-red-50'}`} disabled={u.id === currentUser.id} onClick={() => deleteUser(u.id)}><Trash2 size={18} /></button>
                                    </div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
    </main>
    </div>
    );
}