import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  PlusCircle, 
  FileText, 
  BarChart3, 
  PieChart,
  X,
  Menu,
  Download,
  Upload,
  Trash2,
  Database,
  Users,
  Briefcase,
  Plus,
  History,
  ChevronRight,
  Calendar,
  Pencil,
  FileDown,
  Wallet,
  Layers,
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Target,
  Flag,
  CheckCircle2,
  PiggyBank,
  ShieldCheck,
  Landmark,
  Coins,
  MinusCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart as RePieChart,
  Pie,
  Legend
} from 'recharts';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Transaction, TransactionType, CategoryGroup, Client, Project, Category, ForecastedMovement, Goal, FinancialBox } from './types';
import { INITIAL_TRANSACTIONS, CATEGORIES as DEFAULT_CATEGORIES } from './constants';

const App: React.FC = () => {
  // State from LocalStorage
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('vx-transactions');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });
  const [forecastedMovements, setForecastedMovements] = useState<ForecastedMovement[]>(() => {
    const saved = localStorage.getItem('vx-forecasts');
    return saved ? JSON.parse(saved) : [];
  });
  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('vx-clients');
    return saved ? JSON.parse(saved) : [];
  });
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('vx-projects');
    return saved ? JSON.parse(saved) : [];
  });
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('vx-categories');
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });
  const [goals, setGoals] = useState<Goal[]>(() => {
    const saved = localStorage.getItem('vx-goals');
    return saved ? JSON.parse(saved) : [];
  });
  const [financialBoxes, setFinancialBoxes] = useState<FinancialBox[]>(() => {
    const saved = localStorage.getItem('vx-financial-boxes');
    return saved ? JSON.parse(saved) : [];
  });

  const [view, setView] = useState<'dashboard' | 'transactions' | 'reports' | 'clients' | 'projects' | 'history' | 'goals'>('dashboard');
  
  // Detect mobile for initial sidebar state
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showForecastModal, setShowForecastModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showAddSubCategoryModal, setShowAddSubCategoryModal] = useState(false);
  const [showBoxModal, setShowBoxModal] = useState(false);
  const [showBoxOperationModal, setShowBoxOperationModal] = useState(false);
  
  const [selectedMonthDRE, setSelectedMonthDRE] = useState<string>('all');
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [selectedBox, setSelectedBox] = useState<FinancialBox | null>(null);
  const [boxOperationType, setBoxOperationType] = useState<'deposit' | 'withdraw'>('deposit');
  const [isExporting, setIsExporting] = useState(false);

  const dreRef = useRef<HTMLDivElement>(null);

  // Form States
  const [newTx, setNewTx] = useState({
    description: '',
    amount: '', 
    type: TransactionType.EXPENSE,
    date: new Date().toISOString().split('T')[0],
    category: '',
    subCategory: '',
    clientId: '',
    projectId: ''
  });

  const [newForecast, setNewForecast] = useState({
    description: '',
    amount: '',
    date: '',
    category: '',
    type: TransactionType.EXPENSE
  });

  const [newGoal, setNewGoal] = useState({
    name: '',
    targetAmount: '',
    deadline: ''
  });

  const [newBox, setNewBox] = useState({
    name: '',
    target: '',
    type: 'savings' as 'savings' | 'investment' | 'emergency',
    color: '#79e34c'
  });

  const [boxOperationAmount, setBoxOperationAmount] = useState('');

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize first category if not set
  useEffect(() => {
    if (!newTx.category && categories.length > 0) {
      setNewTx(prev => ({ 
        ...prev, 
        category: categories[0].name,
        subCategory: categories[0].subCategories[0] || ''
      }));
    }
    if (!newForecast.category && categories.length > 0) {
      setNewForecast(prev => ({ ...prev, category: categories[0].name }));
    }
  }, [categories, newTx.category, newForecast.category]);

  const [newClientName, setNewClientName] = useState('');
  const [newProject, setNewProject] = useState({ name: '', clientId: '' });
  const [newCat, setNewCat] = useState({ name: '', group: CategoryGroup.OPERATING_EXPENSE });
  const [newSubCat, setNewSubCat] = useState('');

  // Persistence
  useEffect(() => {
    localStorage.setItem('vx-transactions', JSON.stringify(transactions));
    localStorage.setItem('vx-forecasts', JSON.stringify(forecastedMovements));
    localStorage.setItem('vx-clients', JSON.stringify(clients));
    localStorage.setItem('vx-projects', JSON.stringify(projects));
    localStorage.setItem('vx-categories', JSON.stringify(categories));
    localStorage.setItem('vx-goals', JSON.stringify(goals));
    localStorage.setItem('vx-financial-boxes', JSON.stringify(financialBoxes));
  }, [transactions, forecastedMovements, clients, projects, categories, goals, financialBoxes]);

  // Aggregated Monthly Data
  const monthlyData = useMemo(() => {
    const groups = transactions.reduce((acc: any, curr) => {
      const month = curr.date.substring(0, 7); // YYYY-MM
      if (!acc[month]) acc[month] = { month, income: 0, expense: 0, count: 0 };
      if (curr.type === TransactionType.INCOME) acc[month].income += curr.amount;
      else acc[month].expense += curr.amount;
      acc[month].count += 1;
      return acc;
    }, {});
    return Object.values(groups).sort((a: any, b: any) => b.month.localeCompare(a.month)) as any[];
  }, [transactions]);

  const totals = useMemo(() => {
    const income = transactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((acc, curr) => acc + curr.amount, 0);
    const expenses = transactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((acc, curr) => acc + curr.amount, 0);
    return {
      income,
      expenses,
      balance: income - expenses
    };
  }, [transactions]);

  // Forecast Totals
  const forecastTotals = useMemo(() => {
    const income = forecastedMovements
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((acc, curr) => acc + curr.amount, 0);
    const expenses = forecastedMovements
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((acc, curr) => acc + curr.amount, 0);
    return {
      income,
      expenses,
      balance: income - expenses
    };
  }, [forecastedMovements]);

  // DRE Calculations (Filtered)
  const dreTotals = useMemo(() => {
    const filtered = selectedMonthDRE === 'all' 
      ? transactions 
      : transactions.filter(t => t.date.startsWith(selectedMonthDRE));

    const income = filtered
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((acc, curr) => acc + curr.amount, 0);
    
    const expenses = filtered
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((acc, curr) => acc + curr.amount, 0);

    const cogs = filtered
      .filter(t => t.group === CategoryGroup.COGS)
      .reduce((acc, curr) => acc + curr.amount, 0);

    const operating = filtered
      .filter(t => t.group === CategoryGroup.OPERATING_EXPENSE)
      .reduce((acc, curr) => acc + curr.amount, 0);

    const financial = filtered
      .filter(t => t.group === CategoryGroup.FINANCIAL)
      .reduce((acc, curr) => acc + curr.amount, 0);

    return { income, expenses, cogs, operating, financial, balance: income - expenses };
  }, [transactions, selectedMonthDRE]);

  const parseCurrencyString = (val: string): number => {
    const cleanValue = val.replace(/\D/g, "");
    if (!cleanValue) return 0;
    return parseFloat(cleanValue) / 100;
  };

  const maskCurrency = (value: string | number, forceType?: TransactionType) => {
    const cleanValue = String(value).replace(/\D/g, "");
    if (!cleanValue) return '';
    const options: Intl.NumberFormatOptions = { style: 'currency', currency: 'BRL' };
    const formatted = new Intl.NumberFormat('pt-BR', options).format(parseFloat(cleanValue) / 100);
    const type = forceType || newTx.type;
    return type === TransactionType.EXPENSE ? `-${formatted}` : formatted;
  };

  const handleOpenEdit = (tx: Transaction) => {
    setEditingTxId(tx.id);
    setNewTx({
      description: tx.description,
      amount: maskCurrency(Math.round(tx.amount * 100), tx.type),
      type: tx.type,
      date: tx.date,
      category: tx.category,
      subCategory: tx.subCategory || '',
      clientId: tx.clientId || '',
      projectId: tx.projectId || ''
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setShowAddModal(false);
    setEditingTxId(null);
    setNewTx({ 
      description: '', 
      amount: '', 
      type: TransactionType.EXPENSE, 
      date: new Date().toISOString().split('T')[0], 
      category: categories[0]?.name || '', 
      subCategory: categories[0]?.subCategories[0] || '',
      clientId: '', 
      projectId: '' 
    });
  };

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const amountValue = parseCurrencyString(newTx.amount);
    if (amountValue === 0) return;

    const cat = categories.find((c) => c.name === newTx.category);
    
    if (editingTxId) {
      setTransactions(transactions.map(t => t.id === editingTxId ? {
        ...t,
        description: newTx.description,
        amount: amountValue,
        date: newTx.date,
        type: newTx.type,
        category: newTx.category,
        subCategory: newTx.subCategory || undefined,
        group: cat?.group || CategoryGroup.OPERATING_EXPENSE,
        clientId: newTx.clientId || undefined,
        projectId: newTx.projectId || undefined
      } : t));
    } else {
      const transaction: Transaction = {
        id: crypto.randomUUID(),
        description: newTx.description,
        amount: amountValue,
        date: newTx.date,
        type: newTx.type,
        category: newTx.category,
        subCategory: newTx.subCategory || undefined,
        group: cat?.group || CategoryGroup.OPERATING_EXPENSE,
        clientId: newTx.clientId || undefined,
        projectId: newTx.projectId || undefined
      };
      setTransactions([transaction, ...transactions]);
    }
    
    resetForm();
  };

  const handleAddForecast = (e: React.FormEvent) => {
    e.preventDefault();
    const amountValue = parseCurrencyString(newForecast.amount);
    if (amountValue === 0 || !newForecast.date) return;

    const forecast: ForecastedMovement = {
      id: crypto.randomUUID(),
      description: newForecast.description,
      amount: amountValue,
      date: newForecast.date,
      category: newForecast.category,
      type: newForecast.type
    };

    setForecastedMovements([...forecastedMovements, forecast].sort((a, b) => a.date.localeCompare(b.date)));
    setNewForecast({ description: '', amount: '', date: '', category: categories[0]?.name || '', type: TransactionType.EXPENSE });
    setShowForecastModal(false);
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseCurrencyString(newGoal.targetAmount);
    if (!newGoal.name || target === 0) return;

    const goal: Goal = {
      id: crypto.randomUUID(),
      name: newGoal.name,
      targetAmount: target,
      deadline: newGoal.deadline || undefined
    };

    setGoals([...goals, goal]);
    setNewGoal({ name: '', targetAmount: '', deadline: '' });
  };

  const handleAddBox = (e: React.FormEvent) => {
    e.preventDefault();
    const targetVal = newBox.target ? parseCurrencyString(newBox.target) : undefined;
    
    if (!newBox.name) return;

    const box: FinancialBox = {
      id: crypto.randomUUID(),
      name: newBox.name,
      balance: 0,
      target: targetVal,
      type: newBox.type,
      color: newBox.color
    };

    setFinancialBoxes([...financialBoxes, box]);
    setNewBox({ name: '', target: '', type: 'savings', color: '#79e34c' });
    setShowBoxModal(false);
  };

  const handleBoxOperation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBox) return;

    const val = parseCurrencyString(boxOperationAmount);
    if (val === 0) return;

    const updatedBoxes = financialBoxes.map(b => {
      if (b.id === selectedBox.id) {
        return {
          ...b,
          balance: boxOperationType === 'deposit' ? b.balance + val : Math.max(0, b.balance - val)
        };
      }
      return b;
    });

    setFinancialBoxes(updatedBoxes);
    setBoxOperationAmount('');
    setShowBoxOperationModal(false);
  };

  const deleteBox = (id: string) => {
    if (window.confirm("Tem certeza que deseja remover esta caixinha? O saldo não retornará automaticamente para o fluxo de caixa.")) {
      setFinancialBoxes(financialBoxes.filter(b => b.id !== id));
    }
  };

  const deleteGoal = (id: string) => {
    if (window.confirm("Deseja remover esta meta?")) {
      setGoals(goals.filter(g => g.id !== id));
    }
  };

  const deleteForecast = (id: string) => {
    if (window.confirm("Deseja remover esta previsão?")) {
      setForecastedMovements(forecastedMovements.filter(f => f.id !== id));
    }
  };

  const confirmForecast = (id: string) => {
    const item = forecastedMovements.find(f => f.id === id);
    if (!item) return;

    if (window.confirm(`Confirmar a realização de "${item.description}"?\nIsso moverá o item para os lançamentos oficiais.`)) {
      const catObj = categories.find(c => c.name === item.category);
      
      const transaction: Transaction = {
        id: crypto.randomUUID(),
        description: item.description,
        amount: item.amount,
        date: item.date,
        type: item.type,
        category: item.category,
        group: catObj?.group || CategoryGroup.OPERATING_EXPENSE,
      };

      setTransactions([transaction, ...transactions]);
      setForecastedMovements(forecastedMovements.filter(f => f.id !== id));
    }
  };

  const handleDownloadPDF = async () => {
    if (!dreRef.current) return;
    setIsExporting(true);
    
    try {
      const canvas = await html2canvas(dreRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      const filename = `DRE_GUIFINANCE_${selectedMonthDRE === 'all' ? 'Consolidado' : selectedMonthDRE}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Houve um erro ao gerar o PDF. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCat.name) return;
    const exists = categories.find((c) => c.name.toLowerCase() === newCat.name.toLowerCase());
    if (exists) {
      alert("Esta categoria já existe.");
      return;
    }
    const updatedCats: Category[] = [...categories, { ...newCat, subCategories: [] }];
    setCategories(updatedCats);
    setNewTx(prev => ({ ...prev, category: newCat.name, subCategory: '' }));
    setNewCat({ name: '', group: CategoryGroup.OPERATING_EXPENSE });
    setShowAddCategoryModal(false);
  };

  const handleAddSubCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubCat || !newTx.category) return;
    
    const updatedCats = categories.map(cat => {
      if (cat.name === newTx.category) {
        if (cat.subCategories.includes(newSubCat)) {
          alert("Esta subcategoria já existe nesta categoria.");
          return cat;
        }
        return { ...cat, subCategories: [...cat.subCategories, newSubCat] };
      }
      return cat;
    });

    setCategories(updatedCats);
    setNewTx(prev => ({ ...prev, subCategory: newSubCat }));
    setNewSubCat('');
    setShowAddSubCategoryModal(false);
  };

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName) return;
    const client: Client = { id: crypto.randomUUID(), name: newClientName };
    setClients([...clients, client]);
    setNewClientName('');
  };

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name || !newProject.clientId) return;
    const proj: Project = { id: crypto.randomUUID(), name: newProject.name, clientId: newProject.clientId };
    setProjects([...projects, proj]);
    setNewProject({ name: '', clientId: '' });
  };

  const deleteTransaction = (id: string) => {
    if (window.confirm("Deseja realmente excluir este lançamento?")) {
      setTransactions(transactions.filter(t => t.id !== id));
    }
  };

  const clearAllData = () => {
    if (window.confirm("ATENÇÃO: Isso apagará permanentemente todos os seus dados do navegador. Deseja continuar?")) {
      setTransactions([]);
      setForecastedMovements([]);
      setClients([]);
      setProjects([]);
      setCategories(DEFAULT_CATEGORIES);
      setGoals([]);
      setFinancialBoxes([]);
      localStorage.clear();
    }
  };

  const exportData = () => {
    const data = { transactions, forecastedMovements, clients, projects, categories, goals, financialBoxes };
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `guifinance-backup-${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        if (!data.transactions || !Array.isArray(data.transactions)) {
          throw new Error("O arquivo não parece ser um backup válido do GUIFINANCE.");
        }

        if (window.confirm("Atenção: A importação substituirá todos os dados atuais. Deseja prosseguir?")) {
          setTransactions(data.transactions);
          setForecastedMovements(data.forecastedMovements || []);
          setClients(data.clients || []);
          setProjects(data.projects || []);
          setCategories(data.categories || DEFAULT_CATEGORIES);
          setGoals(data.goals || []);
          setFinancialBoxes(data.financialBoxes || []);
          alert("Backup restaurado com sucesso!");
        }
      } catch (err) {
        alert("Erro ao importar dados: " + (err instanceof Error ? err.message : "Arquivo corrompido ou inválido."));
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const categoryPieData = useMemo(() => {
    const cats = transactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((acc: any, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
        return acc;
      }, {});
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const currentCategorySubCats = useMemo(() => {
    return categories.find(c => c.name === newTx.category)?.subCategories || [];
  }, [newTx.category, categories]);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900 font-['Inter']">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-20 lg:w-20 -translate-x-full lg:translate-x-0'} 
          fixed lg:relative bg-white border-r border-slate-200 transition-all duration-300 flex flex-col shadow-sm z-50 h-full
        `}
      >
        <div className="p-6 flex items-center gap-3">
          <div 
            className="w-12 h-12 flex items-center justify-center bg-[#79e34c] rounded-2xl shadow-lg shadow-[#79e34c]/20 flex-shrink-0 cursor-pointer transition-transform hover:scale-105 active:scale-95"
            onClick={() => setView('dashboard')}
          >
            <Wallet size={24} className="text-slate-900" />
          </div>
          {isSidebarOpen && <span className="font-black text-xl text-slate-800 tracking-tighter whitespace-nowrap uppercase">GUIFINANCE</span>}
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto overflow-x-hidden scrollbar-hide">
          <NavItem 
            active={view === 'dashboard'} 
            onClick={() => { setView('dashboard'); if(isMobile) setIsSidebarOpen(false); }} 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            collapsed={!isSidebarOpen} 
          />
          <NavItem 
            active={view === 'transactions'} 
            onClick={() => { setView('transactions'); if(isMobile) setIsSidebarOpen(false); }} 
            icon={<BarChart3 size={20} />} 
            label="Transações" 
            collapsed={!isSidebarOpen} 
          />
          <NavItem 
            active={view === 'clients'} 
            onClick={() => { setView('clients'); if(isMobile) setIsSidebarOpen(false); }} 
            icon={<Users size={20} />} 
            label="Clientes" 
            collapsed={!isSidebarOpen} 
          />
          <NavItem 
            active={view === 'projects'} 
            onClick={() => { setView('projects'); if(isMobile) setIsSidebarOpen(false); }} 
            icon={<Briefcase size={20} />} 
            label="Projetos" 
            collapsed={!isSidebarOpen} 
          />
          <NavItem 
            active={view === 'reports'} 
            onClick={() => { setView('reports'); if(isMobile) setIsSidebarOpen(false); }} 
            icon={<FileText size={20} />} 
            label="DRE" 
            collapsed={!isSidebarOpen} 
          />
          <NavItem 
            active={view === 'goals'} 
            onClick={() => { setView('goals'); if(isMobile) setIsSidebarOpen(false); }} 
            icon={<Target size={20} />} 
            label="Metas" 
            collapsed={!isSidebarOpen} 
          />
          <NavItem 
            active={view === 'history'} 
            onClick={() => { setView('history'); if(isMobile) setIsSidebarOpen(false); }} 
            icon={<History size={20} />} 
            label="Histórico" 
            collapsed={!isSidebarOpen} 
          />
        </nav>

        <div className="p-4 space-y-2 border-t border-slate-100">
          {isSidebarOpen && (
            <div className="px-4 py-2 bg-emerald-50 rounded-lg flex items-center gap-2 mb-2">
              <Database size={14} className="text-emerald-600" />
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-tighter">Armazenamento Local</span>
            </div>
          )}
          
          <div className={`grid ${isSidebarOpen ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
            <button onClick={exportData} title="Exportar Backup" className="flex items-center justify-center gap-3 px-2 py-2.5 text-slate-500 hover:text-[#79e34c] hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-200">
              <Download size={18} />
              {isSidebarOpen && <span className="text-sm font-medium">Exportar</span>}
            </button>
            <div className="relative">
              <input type="file" id="import-file" className="hidden" accept=".json" onChange={handleImportData} />
              <label htmlFor="import-file" title="Importar Backup" className="flex items-center justify-center gap-3 px-2 py-2.5 text-slate-500 hover:text-[#79e34c] hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-200 cursor-pointer">
                <Upload size={18} />
                {isSidebarOpen && <span className="text-sm font-medium">Importar</span>}
              </label>
            </div>
          </div>

          <button onClick={clearAllData} title="Limpar Tudo" className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
            <Trash2 size={18} />
            {isSidebarOpen && <span className="text-sm font-medium">Limpar Tudo</span>}
          </button>
          
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="w-full hidden lg:flex items-center justify-center p-2 text-slate-400 hover:text-[#79e34c] hover:bg-[#79e34c]/5 rounded-lg transition-colors mt-2"
          >
            <Menu size={20} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative scroll-smooth bg-slate-50">
        <header className="sticky top-0 z-30 bg-slate-50/80 backdrop-blur-md px-4 lg:px-8 py-4 lg:py-6 flex justify-between items-center border-b border-transparent">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className="lg:hidden p-2 text-slate-600 hover:bg-white rounded-xl shadow-sm border border-slate-200"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-xl lg:text-3xl font-black text-slate-800 tracking-tight capitalize leading-tight">
                {view === 'dashboard' && 'Visão Geral'}
                {view === 'history' && 'Histórico'}
                {view === 'transactions' && 'Lançamentos'}
                {view === 'clients' && 'Clientes'}
                {view === 'projects' && 'Projetos'}
                {view === 'reports' && 'DRE'}
                {view === 'goals' && 'Minhas Metas'}
              </h1>
              <p className="hidden md:block text-slate-500 text-xs font-medium">GUIFINANCE - {view === 'reports' && selectedMonthDRE !== 'all' ? `Análise de ${formatMonth(selectedMonthDRE)}` : 'Consolidado Local'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowForecastModal(true)}
              className="flex items-center gap-2 bg-slate-800 hover:bg-black text-white px-4 lg:px-6 py-2.5 lg:py-3 rounded-xl lg:rounded-2xl font-bold shadow-lg transition-all hover:scale-[1.02] active:scale-95 text-sm lg:text-base"
            >
              <Clock size={18} />
              <span className="hidden sm:inline">Prever Movimento</span>
            </button>
            <button 
              onClick={() => { resetForm(); setShowAddModal(true); }}
              className="flex items-center gap-2 bg-[#79e34c] hover:bg-[#6bd63f] text-slate-900 px-4 lg:px-6 py-2.5 lg:py-3 rounded-xl lg:rounded-2xl font-bold shadow-lg shadow-[#79e34c]/20 transition-all hover:scale-[1.02] active:scale-95 text-sm lg:text-base"
            >
              <PlusCircle size={18} />
              <span className="hidden sm:inline">Novo Lançamento</span>
              <span className="sm:hidden">Novo</span>
            </button>
          </div>
        </header>

        <div className="px-4 lg:px-8 pb-10">
          {/* Dashboard View */}
          {view === 'dashboard' && (
            <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                <StatCard title="Entradas" value={formatCurrency(totals.income)} icon={<ArrowUpCircle className="text-emerald-500" />} color="bg-emerald-50" />
                <StatCard title="Saídas" value={formatCurrency(totals.expenses)} icon={<ArrowDownCircle className="text-rose-500" />} color="bg-rose-50" />
                <StatCard title="Saldo em Caixa" value={formatCurrency(totals.balance)} icon={<PieChart className="text-slate-900" />} color="bg-[#79e34c]" />
              </div>

              {/* Financial Boxes Section */}
              <div className="mt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <PiggyBank size={18} className="text-[#79e34c]" />
                    Minhas Reservas
                  </h3>
                  <button onClick={() => setShowBoxModal(true)} className="text-[10px] font-black uppercase tracking-widest text-[#79e34c] hover:text-[#6bd63f] border border-[#79e34c] hover:border-[#6bd63f] px-3 py-1.5 rounded-lg transition-all">
                    + Nova Caixinha
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                   {financialBoxes.length > 0 ? financialBoxes.map(box => {
                     const boxIcon = 
                        box.type === 'emergency' ? <ShieldCheck size={20} className="text-rose-500" /> : 
                        box.type === 'investment' ? <TrendingUp size={20} className="text-indigo-500" /> : 
                        <Landmark size={20} className="text-emerald-500" />;
                     const progress = box.target ? Math.min((box.balance / box.target) * 100, 100) : 0;

                     return (
                       <div key={box.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group relative">
                         <div className="flex justify-between items-start mb-3">
                            <div className="bg-slate-50 p-2 rounded-xl">{boxIcon}</div>
                            <button onClick={() => deleteBox(box.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-rose-500 p-1">
                              <Trash2 size={16} />
                            </button>
                         </div>
                         <h4 className="font-black text-slate-700 text-sm uppercase tracking-tight truncate mb-1">{box.name}</h4>
                         <div className="text-xl font-black text-slate-900 tabular-nums tracking-tighter mb-4">{formatCurrency(box.balance)}</div>
                         
                         {box.target && (
                           <div className="mb-4">
                              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                <span>Meta</span>
                                <span>{progress.toFixed(0)}%</span>
                              </div>
                              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-[#79e34c] rounded-full" style={{ width: `${progress}%` }} />
                              </div>
                           </div>
                         )}

                         <div className="flex gap-2 mt-auto">
                            <button 
                              onClick={() => { setSelectedBox(box); setBoxOperationType('deposit'); setShowBoxOperationModal(true); }}
                              className="flex-1 flex items-center justify-center gap-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors text-xs font-bold"
                            >
                              <PlusCircle size={14} /> Depositar
                            </button>
                            <button 
                              onClick={() => { setSelectedBox(box); setBoxOperationType('withdraw'); setShowBoxOperationModal(true); }}
                              className="flex-1 flex items-center justify-center gap-1 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors text-xs font-bold"
                            >
                              <MinusCircle size={14} /> Sacar
                            </button>
                         </div>
                       </div>
                     );
                   }) : (
                     <div className="col-span-full py-8 flex flex-col items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <Coins size={32} className="text-slate-300 mb-2" />
                        <p className="text-xs font-bold text-slate-400">Nenhuma reserva criada</p>
                     </div>
                   )}
                </div>
              </div>

              {/* Long-term Forecast Panel */}
              <div className="bg-white p-5 lg:p-6 rounded-2xl lg:rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Clock size={18} className="text-[#79e34c]" />
                    Compromissos Futuros
                  </h3>
                  
                  {/* Forecast Totals Summary */}
                  {forecastedMovements.length > 0 && (
                    <div className="flex flex-wrap gap-3 bg-slate-50 p-2 rounded-xl">
                       <div className="px-3 py-1 rounded-lg border border-emerald-100 bg-white shadow-sm flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <div className="flex flex-col">
                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Prev. Entradas</span>
                             <span className="text-xs font-black text-emerald-600 tabular-nums leading-none">{formatCurrency(forecastTotals.income)}</span>
                          </div>
                       </div>
                       <div className="px-3 py-1 rounded-lg border border-rose-100 bg-white shadow-sm flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          <div className="flex flex-col">
                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Prev. Saídas</span>
                             <span className="text-xs font-black text-rose-600 tabular-nums leading-none">{formatCurrency(forecastTotals.expenses)}</span>
                          </div>
                       </div>
                       <div className="px-3 py-1 rounded-lg border border-slate-200 bg-slate-100 shadow-sm flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${forecastTotals.balance >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <div className="flex flex-col">
                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Prev. Saldo</span>
                             <span className={`text-xs font-black tabular-nums leading-none ${forecastTotals.balance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatCurrency(forecastTotals.balance)}</span>
                          </div>
                       </div>
                    </div>
                  )}
                </div>
                
                {forecastedMovements.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {forecastedMovements.map(f => (
                      <div key={f.id} className={`p-4 bg-slate-50 border rounded-2xl transition-all group relative ${f.type === TransactionType.INCOME ? 'border-emerald-100 hover:border-emerald-300' : 'border-rose-100 hover:border-rose-300'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{f.date.split('-').reverse().join('/')}</span>
                          <div className="flex gap-2">
                            {f.type === TransactionType.INCOME ? <TrendingUp size={14} className="text-emerald-500" /> : <TrendingDown size={14} className="text-rose-500" />}
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all absolute right-2 top-2 bg-white/80 backdrop-blur-sm p-1 rounded-lg shadow-sm border border-slate-100">
                              <button 
                                onClick={() => confirmForecast(f.id)} 
                                title="Confirmar Realização"
                                className="text-slate-300 hover:text-emerald-500 p-1 hover:bg-emerald-50 rounded-md transition-all"
                              >
                                <CheckCircle2 size={16} />
                              </button>
                              <button 
                                onClick={() => deleteForecast(f.id)} 
                                title="Excluir"
                                className="text-slate-300 hover:text-rose-500 p-1 hover:bg-rose-50 rounded-md transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="font-bold text-slate-800 truncate mb-1 pr-14" title={f.description}>{f.description}</div>
                        <div className="flex justify-between items-end">
                          <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{f.category}</span>
                          <span className={`font-black tabular-nums ${f.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {f.type === TransactionType.INCOME ? '+' : '-'} {formatCurrency(f.amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
                    <AlertCircle size={24} className="mb-2 opacity-50" />
                    <p className="text-sm font-medium">Nenhum movimento previsto para o futuro.</p>
                    <button onClick={() => setShowForecastModal(true)} className="mt-3 text-xs font-black text-[#79e34c] uppercase hover:underline">Adicionar Previsão</button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                <div className="bg-white p-5 lg:p-6 rounded-2xl lg:rounded-3xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
                  <h3 className="font-bold text-slate-800 mb-6 flex items-center justify-between">
                    Fluxo Mensal
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Geral</span>
                  </h3>
                  <div className="h-64 sm:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[...monthlyData].reverse()}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val/1000}k`} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} 
                          formatter={(val: any) => formatCurrency(Number(val) || 0)} 
                        />
                        <Bar dataKey="income" fill="#10b981" radius={[6, 6, 0, 0]} name="Receita" />
                        <Bar dataKey="expense" fill="#f43f5e" radius={[6, 6, 0, 0]} name="Despesa" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-white p-5 lg:p-6 rounded-2xl lg:rounded-3xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
                  <h3 className="font-bold text-slate-800 mb-6 flex items-center justify-between">
                    Gastos por Categoria
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Pizza</span>
                  </h3>
                  <div className="h-64 sm:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie 
                          data={categoryPieData} 
                          innerRadius={50} 
                          outerRadius={70} 
                          paddingAngle={5} 
                          dataKey="value"
                          label={({ name }) => name}
                          fontSize={10}
                        >
                          {categoryPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#79e34c', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'][index % 5]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val: any) => formatCurrency(Number(val) || 0)} />
                        <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{ fontSize: '10px' }}/>
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Goals View */}
          {view === 'goals' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 animate-in fade-in duration-500">
               <div className="lg:col-span-1">
                 <div className="bg-white p-6 lg:p-8 rounded-2xl lg:rounded-3xl border border-slate-100 shadow-sm lg:sticky lg:top-24">
                   <h3 className="font-black text-slate-800 text-lg lg:text-xl mb-6 flex items-center gap-3">
                     <Flag size={22} className="text-[#79e34c]" />
                     Nova Meta
                   </h3>
                   <form onSubmit={handleAddGoal} className="space-y-4 lg:space-y-6">
                     <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome da Meta</label>
                       <input 
                         required 
                         type="text" 
                         value={newGoal.name} 
                         onChange={e => setNewGoal({...newGoal, name: e.target.value})} 
                         className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-[#79e34c] transition-all text-sm font-bold" 
                         placeholder="Ex: Fundo de Reserva" 
                       />
                     </div>
                     <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Valor Alvo</label>
                       <input 
                         required 
                         type="text" 
                         inputMode="numeric"
                         value={newGoal.targetAmount} 
                         onChange={e => setNewGoal({...newGoal, targetAmount: maskCurrency(e.target.value, TransactionType.INCOME)})} 
                         className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-[#79e34c] transition-all text-sm font-bold" 
                         placeholder="R$ 0,00" 
                       />
                     </div>
                     <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Prazo (Opcional)</label>
                       <input 
                         type="date" 
                         value={newGoal.deadline} 
                         onChange={e => setNewGoal({...newGoal, deadline: e.target.value})} 
                         className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-[#79e34c] transition-all text-sm font-bold" 
                       />
                     </div>
                     <button type="submit" className="w-full bg-slate-800 text-white font-black py-4 rounded-xl lg:rounded-2xl hover:bg-black transition-all shadow-lg text-xs uppercase tracking-widest">
                       Criar Meta Financeira
                     </button>
                   </form>
                 </div>
               </div>

               <div className="lg:col-span-2 space-y-4 lg:space-y-6">
                 {goals.length > 0 ? goals.map(goal => {
                   const progress = Math.min((totals.balance / goal.targetAmount) * 100, 100);
                   const missing = Math.max(goal.targetAmount - totals.balance, 0);
                   const isCompleted = totals.balance >= goal.targetAmount;

                   return (
                     <div key={goal.id} className="bg-white p-6 lg:p-8 rounded-2xl lg:rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                       <div className="flex justify-between items-start mb-6">
                         <div>
                            <h4 className="font-black text-slate-800 text-xl lg:text-2xl tracking-tighter uppercase leading-none mb-1">{goal.name}</h4>
                            {goal.deadline && (
                              <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <Calendar size={12} /> Prazo: {goal.deadline.split('-').reverse().join('/')}
                              </div>
                            )}
                         </div>
                         <button onClick={() => deleteGoal(goal.id)} className="text-slate-300 hover:text-rose-500 p-2 hover:bg-rose-50 rounded-xl transition-all">
                           <Trash2 size={20} />
                         </button>
                       </div>

                       <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                          <div>
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Meta</span>
                             <span className="text-lg font-black text-slate-800 tabular-nums">{formatCurrency(goal.targetAmount)}</span>
                          </div>
                          <div>
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Saldo Atual</span>
                             <span className="text-lg font-black text-emerald-600 tabular-nums">{formatCurrency(totals.balance)}</span>
                          </div>
                          <div>
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Falta para Alcançar</span>
                             <span className={`text-lg font-black tabular-nums ${isCompleted ? 'text-emerald-500' : 'text-rose-500'}`}>
                               {isCompleted ? 'Alcançada!' : formatCurrency(missing)}
                             </span>
                          </div>
                       </div>

                       <div className="relative">
                          <div className="flex justify-between items-center mb-2">
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progresso</span>
                             <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{progress.toFixed(1)}%</span>
                          </div>
                          <div className="h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-100">
                             <div 
                               className={`h-full transition-all duration-1000 ease-out rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-[#79e34c]'}`}
                               style={{ width: `${progress}%` }}
                             />
                          </div>
                          {isCompleted && (
                            <div className="mt-4 flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-widest">
                              <TrendingUp size={14} /> Meta batida! Parabéns por sua disciplina financeira.
                            </div>
                          )}
                       </div>
                     </div>
                   );
                 }) : (
                   <div className="py-20 flex flex-col items-center justify-center text-slate-300 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                      <Target size={48} className="mb-4 opacity-20" />
                      <p className="font-bold text-sm">Você ainda não definiu nenhuma meta.</p>
                      <p className="text-xs mt-1">Defina objetivos financeiros para acompanhar seu progresso.</p>
                   </div>
                 )}
               </div>
            </div>
          )}

          {/* History View */}
          {view === 'history' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {monthlyData.length > 0 ? monthlyData.map((data) => (
                <div key={data.month} className="bg-white p-5 lg:p-6 rounded-2xl lg:rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4 lg:mb-6">
                      <div>
                        <h4 className="font-black text-slate-800 text-lg lg:text-xl capitalize leading-none mb-1">{formatMonth(data.month)}</h4>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{data.count} lançamentos</span>
                      </div>
                      <div className="bg-[#79e34c]/10 p-2 rounded-xl lg:rounded-2xl text-slate-800">
                         <Calendar size={18} />
                      </div>
                    </div>

                    <div className="space-y-2 lg:space-y-3 mb-6 lg:mb-8">
                      <div className="flex justify-between text-xs lg:text-sm">
                        <span className="text-slate-400 font-bold uppercase tracking-tighter">Entradas</span>
                        <span className="font-bold text-emerald-600 tabular-nums">{formatCurrency(data.income)}</span>
                      </div>
                      <div className="flex justify-between text-xs lg:text-sm">
                        <span className="text-slate-400 font-bold uppercase tracking-tighter">Saídas</span>
                        <span className="font-bold text-rose-500 tabular-nums">{formatCurrency(data.expense)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black text-slate-300 uppercase block mb-0.5">Resultado Líquido</span>
                      <span className={`text-lg lg:text-xl font-black tabular-nums ${data.income - data.expense >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {formatCurrency(data.income - data.expense)}
                      </span>
                    </div>
                    <button 
                      onClick={() => { setSelectedMonthDRE(data.month); setView('reports'); }}
                      className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:bg-[#79e34c] hover:text-slate-900 transition-all shadow-sm"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )) : (
                <div className="col-span-full py-20 lg:py-32 text-center text-slate-400 font-bold">Nenhum histórico disponível.</div>
              )}
            </div>
          )}

          {/* Transactions Table View */}
          {view === 'transactions' && (
            <div className="bg-white rounded-2xl lg:rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
              <div className="p-4 lg:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <h3 className="font-bold text-slate-800 text-base lg:text-lg">Histórico Financeiro</h3>
                 <span className="px-2 py-1 bg-slate-200 text-slate-600 rounded-lg text-[10px] lg:text-xs font-black uppercase tracking-widest">{transactions.length} registros</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-100">
                      <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                      <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                      <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</th>
                      <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Atribuição</th>
                      <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                      <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-all group">
                        <td className="px-4 lg:px-6 py-4 lg:py-5 text-xs lg:text-sm text-slate-500 tabular-nums">{tx.date}</td>
                        <td className="px-4 lg:px-6 py-4 lg:py-5 text-xs lg:text-sm font-bold text-slate-800">{tx.description}</td>
                        <td className="px-4 lg:px-6 py-4 lg:py-5">
                          <div className="flex flex-col">
                            <span className="px-2 py-0.5 lg:px-2.5 lg:py-1 rounded-lg text-[9px] lg:text-[10px] font-black uppercase bg-slate-100 text-slate-500 group-hover:bg-[#79e34c]/20 group-hover:text-slate-900 transition-colors w-fit">
                              {tx.category}
                            </span>
                            {tx.subCategory && (
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mt-1 pl-1">
                                └ {tx.subCategory}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 lg:py-5 text-xs lg:text-sm text-slate-500">
                          <div className="flex flex-col">
                             <span className="font-medium">{tx.clientId ? clients.find(c => c.id === tx.clientId)?.name : '-'}</span>
                             {tx.projectId && <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Proj: {projects.find(p => p.id === tx.projectId)?.name}</span>}
                          </div>
                        </td>
                        <td className={`px-4 lg:px-6 py-4 lg:py-5 text-xs lg:text-sm font-black text-right tabular-nums ${tx.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {tx.type === TransactionType.INCOME ? '+' : '-'} {formatCurrency(tx.amount)}
                        </td>
                        <td className="px-4 lg:px-6 py-4 lg:py-5 text-center">
                          <div className="flex items-center justify-center gap-1 lg:gap-2">
                            <button onClick={() => handleOpenEdit(tx)} title="Editar" className="text-slate-300 hover:text-[#79e34c] transition-all p-1.5 lg:p-2 hover:bg-[#79e34c]/5 rounded-lg lg:rounded-xl">
                              <Pencil size={16} />
                            </button>
                            <button onClick={() => deleteTransaction(tx.id)} title="Excluir" className="text-slate-300 hover:text-rose-600 transition-all p-1.5 lg:p-2 hover:bg-rose-50 rounded-lg lg:rounded-xl">
                              <X size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Reports View (DRE) */}
          {view === 'reports' && (
            <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-700">
              <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
                 <div className="w-full sm:w-auto flex items-center gap-3 bg-white px-4 py-3 rounded-xl border border-slate-100 shadow-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mês</span>
                    <select 
                      value={selectedMonthDRE} 
                      onChange={(e) => setSelectedMonthDRE(e.target.value)}
                      className="flex-1 bg-transparent font-black text-slate-800 text-sm outline-none cursor-pointer"
                    >
                      <option value="all">Consolidado Geral</option>
                      {[...monthlyData].reverse().map(d => (
                        <option key={d.month} value={d.month}>{formatMonth(d.month)}</option>
                      ))}
                    </select>
                 </div>
                 
                 <button 
                   onClick={handleDownloadPDF}
                   disabled={isExporting}
                   className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-800 hover:bg-black text-white px-6 py-3 rounded-xl lg:rounded-2xl font-bold shadow-xl transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100"
                 >
                   {isExporting ? <span className="animate-pulse">Gerando...</span> : <><FileDown size={18} /> Baixar PDF</>}
                 </button>
              </div>

              <div className="overflow-x-auto pb-4">
                <div ref={dreRef} className="bg-white p-6 lg:p-10 rounded-2xl lg:rounded-[2.5rem] border border-slate-100 shadow-xl max-w-4xl mx-auto relative overflow-hidden pdf-export-container min-w-[320px]">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                     <FileText size={100} className="text-[#79e34c]" />
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 lg:mb-12 border-b-2 border-slate-50 pb-6 lg:pb-8 relative z-10 gap-4">
                    <div>
                      <h2 className="text-xl lg:text-3xl font-black text-slate-900 tracking-tighter uppercase">DRE Simplificada</h2>
                      <p className="text-slate-400 font-bold tracking-widest text-[9px] lg:text-[10px] mt-1 uppercase">GUIFINANCE SOLUTIONS</p>
                    </div>
                    <div className="text-left sm:text-right w-full sm:w-auto">
                       <div className="inline-block px-3 py-1 bg-slate-900 text-white text-[9px] font-black rounded-full mb-2 tracking-widest uppercase">
                         {selectedMonthDRE === 'all' ? 'Consolidado' : formatMonth(selectedMonthDRE)}
                       </div>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5 lg:space-y-2 relative z-10">
                    <DRELine label="(+) RECEITA BRUTA" value={dreTotals.income} bold highlight />
                    <DRELine label="(-) IMPOSTOS" value={dreTotals.income * 0.06} isNegative />
                    <div className="h-px bg-slate-100 my-4" />
                    <DRELine label="(=) RECEITA LÍQUIDA" value={dreTotals.income * 0.94} bold />
                    <DRELine label="(-) CUSTOS DE VENDA" value={dreTotals.cogs} isNegative />
                    <div className="h-px bg-slate-100 my-4" />
                    <DRELine label="(=) LUCRO BRUTO" value={(dreTotals.income * 0.94) - dreTotals.cogs} bold />
                    <DRELine label="(-) DESPESAS OPER." value={dreTotals.operating} isNegative />
                    <DRELine label="(+/-) RES. FINANC." value={dreTotals.financial} />
                    <div className="pt-8 lg:pt-12">
                      <div className={`p-5 lg:p-8 rounded-xl lg:rounded-[2rem] border-2 flex flex-col sm:flex-row justify-between items-center transition-all gap-4 ${dreTotals.balance >= 0 ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'}`}>
                        <div className="text-center sm:text-left">
                          <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Resultado Líquido</span>
                          <span className="text-xl lg:text-2xl font-black text-slate-900 tracking-tighter">Exercício GUIFINANCE</span>
                        </div>
                        <div className="text-center sm:text-right">
                           <span className={`text-3xl lg:text-5xl font-black tabular-nums tracking-tighter ${dreTotals.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                             {formatCurrency(dreTotals.balance)}
                           </span>
                           <div className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                             Margem: {dreTotals.income > 0 ? ((dreTotals.balance / dreTotals.income) * 100).toFixed(1) : 0}%
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Clients & Projects View */}
          {(view === 'clients' || view === 'projects') && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 animate-in fade-in duration-500">
              <div className="lg:col-span-1 order-2 lg:order-1">
                <div className="bg-white p-6 lg:p-8 rounded-2xl lg:rounded-3xl border border-slate-100 shadow-sm lg:sticky lg:top-24">
                  <h3 className="font-black text-slate-800 text-lg lg:text-xl mb-6 flex items-center gap-3">
                    {view === 'clients' ? <Users size={22} className="text-[#79e34c]" /> : <Briefcase size={22} className="text-[#79e34c]" />} 
                    Novo {view === 'clients' ? 'Cliente' : 'Projeto'}
                  </h3>
                  <form onSubmit={view === 'clients' ? handleAddClient : handleAddProject} className="space-y-4 lg:space-y-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nome</label>
                      <input 
                        required 
                        type="text" 
                        value={view === 'clients' ? newClientName : newProject.name} 
                        onChange={e => view === 'clients' ? setNewClientName(e.target.value) : setNewProject({...newProject, name: e.target.value})} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-[#79e34c]/5 outline-none transition-all text-sm" 
                        placeholder={view === 'clients' ? "Ex: Google Inc" : "Ex: Redesign Website"} 
                      />
                    </div>
                    {view === 'projects' && (
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Cliente</label>
                        <select 
                          required 
                          value={newProject.clientId} 
                          onChange={e => setNewProject({...newProject, clientId: e.target.value})} 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none text-sm"
                        >
                          <option value="">Selecione...</option>
                          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    )}
                    <button type="submit" className="w-full bg-slate-800 text-white font-black py-3.5 lg:py-4 rounded-xl lg:rounded-2xl hover:bg-black transition-all shadow-lg text-sm uppercase tracking-widest">
                      {view === 'clients' ? 'Cadastrar Cliente' : 'Criar Projeto'}
                    </button>
                  </form>
                </div>
              </div>
              <div className="lg:col-span-2 order-1 lg:order-2">
                <div className="bg-white rounded-2xl lg:rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-4 lg:p-6 border-b border-slate-100 bg-slate-50/50 font-black text-slate-400 text-[10px] lg:text-xs uppercase tracking-widest flex justify-between items-center">
                    {view === 'clients' ? 'Lista de Parceiros' : 'Carteira de Projetos'}
                    <span className="text-slate-900 bg-[#79e34c] px-2 py-0.5 rounded-full text-[9px]">
                      {view === 'clients' ? `${clients.length} ativos` : `${projects.length} ativos`}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto scrollbar-hide">
                    {(view === 'clients' ? clients : projects).map((item: any) => (
                      <div key={item.id} className="p-4 lg:p-6 flex justify-between items-center hover:bg-slate-50 transition-all group">
                        <div>
                          <div className="font-black text-slate-800 text-base lg:text-lg group-hover:text-[#79e34c] transition-colors">{item.name}</div>
                          {view === 'clients' ? (
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                              {projects.filter(p => p.clientId === item.id).length} Projetos
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 mt-1">
                               <Users size={12} className="text-slate-400" />
                               <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                                 {clients.find(c => c.id === item.clientId)?.name || 'Removido'}
                               </span>
                            </div>
                          )}
                        </div>
                        <button 
                          onClick={() => view === 'clients' ? setClients(clients.filter(c => c.id !== item.id)) : setProjects(projects.filter(p => p.id !== item.id))} 
                          className="text-slate-300 hover:text-rose-600 transition-all p-2 hover:bg-rose-50 rounded-xl"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                    {(view === 'clients' ? clients : projects).length === 0 && (
                      <div className="p-10 text-center text-slate-300 font-medium italic text-sm">
                        Nenhum registro encontrado.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add/Edit Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-2xl lg:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 border border-slate-200 flex flex-col max-h-[95vh]">
            <div className="p-5 lg:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
              <div>
                <h3 className="text-xl lg:text-2xl font-black text-slate-800 tracking-tight leading-none">{editingTxId ? 'Editar Lançamento' : 'Novo Lançamento'}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">{editingTxId ? 'Alterar registro' : 'Nova movimentação'}</p>
              </div>
              <button onClick={resetForm} className="bg-white p-2.5 rounded-xl text-slate-400 hover:text-slate-800 shadow-sm border border-slate-100 transition-all hover:rotate-90">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddTransaction} className="p-5 lg:p-10 space-y-4 lg:space-y-6 overflow-y-auto scrollbar-hide">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                <div className="md:col-span-2">
                  <label className="block text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Descrição</label>
                  <input autoFocus required type="text" value={newTx.description} onChange={e => setNewTx({...newTx, description: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl px-4 lg:px-6 py-3 lg:py-4 text-slate-800 font-bold outline-none focus:border-[#79e34c] transition-all text-sm" placeholder="Ex: Recebimento Projeto Alpha" />
                </div>
                <div>
                  <label className="block text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tipo</label>
                  <select value={newTx.type} onChange={e => {
                    const newType = e.target.value as TransactionType;
                    setNewTx({...newTx, type: newType, amount: maskCurrency(newTx.amount, newType)});
                  }} className={`w-full bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl px-4 lg:px-6 py-3 lg:py-4 font-black outline-none transition-all text-sm ${newTx.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>
                    <option value={TransactionType.INCOME}>Entrada (+)</option>
                    <option value={TransactionType.EXPENSE}>Saída (-)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Valor</label>
                  <input required type="text" inputMode="numeric" value={newTx.amount} onChange={e => setNewTx({...newTx, amount: maskCurrency(e.target.value)})} className={`w-full bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl px-4 lg:px-6 py-3 lg:py-4 font-black text-base lg:text-xl outline-none focus:border-[#79e34c] transition-all ${newTx.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`} placeholder="R$ 0,00" />
                </div>
                <div>
                  <label className="block text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Data</label>
                  <input required type="date" value={newTx.date} onChange={e => setNewTx({...newTx, date: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl px-4 lg:px-6 py-3 lg:py-4 text-slate-800 font-bold outline-none focus:border-[#79e34c] transition-all text-sm" />
                </div>
                <div className="relative">
                  <label className="block text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Categoria</label>
                  <div className="flex gap-2">
                    <select value={newTx.category} onChange={e => setNewTx({...newTx, category: e.target.value, subCategory: categories.find(c => c.name === e.target.value)?.subCategories[0] || ''})} className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl px-4 lg:px-6 py-3 lg:py-4 text-slate-800 font-bold outline-none focus:border-[#79e34c] transition-all text-sm">
                      {categories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                    <button type="button" onClick={() => setShowAddCategoryModal(true)} className="bg-[#79e34c] text-slate-900 p-3 lg:p-4 rounded-xl lg:rounded-2xl shadow-lg shadow-[#79e34c]/10 hover:bg-[#6bd63f] transition-all">
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <label className="block text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Subcategoria</label>
                  <div className="flex gap-2">
                    <select value={newTx.subCategory} onChange={e => setNewTx({...newTx, subCategory: e.target.value})} className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl px-4 lg:px-6 py-3 lg:py-4 text-slate-800 font-bold outline-none focus:border-[#79e34c] transition-all text-sm disabled:opacity-50">
                      <option value="">Nenhuma</option>
                      {currentCategorySubCats.map((sc) => <option key={sc} value={sc}>{sc}</option>)}
                    </select>
                    <button type="button" onClick={() => setShowAddSubCategoryModal(true)} className="bg-[#79e34c] text-slate-900 p-3 lg:p-4 rounded-xl lg:rounded-2xl shadow-lg shadow-[#79e34c]/10 hover:bg-[#6bd63f] transition-all">
                      <Layers size={18} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Cliente</label>
                  <select value={newTx.clientId} onChange={e => setNewTx({...newTx, clientId: e.target.value, projectId: ''})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl px-4 lg:px-6 py-3 lg:py-4 text-slate-800 font-bold outline-none focus:border-[#79e34c] transition-all text-sm">
                    <option value="">Nenhum</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Projeto</label>
                  <select disabled={!newTx.clientId} value={newTx.projectId} onChange={e => setNewTx({...newTx, projectId: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl px-4 lg:px-6 py-3 lg:py-4 text-slate-800 font-bold outline-none focus:border-[#79e34c] transition-all disabled:opacity-40 text-sm">
                    <option value="">Nenhum</option>
                    {projects.filter(p => p.clientId === newTx.clientId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full bg-[#79e34c] hover:bg-black hover:text-white text-slate-900 font-black py-4 lg:py-5 rounded-xl lg:rounded-3xl shadow-xl shadow-[#79e34c]/20 transition-all mt-4 transform active:scale-95 uppercase tracking-widest text-xs lg:text-sm">
                {editingTxId ? 'Salvar Alterações' : 'Efetuar Lançamento'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Forecasted Movement Modal */}
      {showForecastModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-2xl lg:rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-5 lg:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
              <div>
                <h3 className="text-xl lg:text-2xl font-black text-slate-800 tracking-tight leading-none">Prever Movimentação</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">Compromisso Futuro</p>
              </div>
              <button onClick={() => setShowForecastModal(false)} className="bg-white p-2.5 rounded-xl text-slate-400 hover:text-slate-800 shadow-sm border border-slate-100 transition-all">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddForecast} className="p-5 lg:p-10 space-y-4 lg:space-y-6">
              <div className="flex bg-slate-100 p-1 rounded-2xl">
                <button 
                  type="button" 
                  onClick={() => setNewForecast({...newForecast, type: TransactionType.INCOME})}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${newForecast.type === TransactionType.INCOME ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
                >
                  <TrendingUp size={14} /> Receita
                </button>
                <button 
                  type="button" 
                  onClick={() => setNewForecast({...newForecast, type: TransactionType.EXPENSE})}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${newForecast.type === TransactionType.EXPENSE ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}
                >
                  <TrendingDown size={14} /> Despesa
                </button>
              </div>

              <div>
                <label className="block text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Descrição</label>
                <input required type="text" value={newForecast.description} onChange={e => setNewForecast({...newForecast, description: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl px-4 lg:px-6 py-3 lg:py-4 text-slate-800 font-bold outline-none focus:border-[#79e34c] transition-all text-sm" placeholder="Ex: Pagamento Fornecedor X" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Valor Estimado</label>
                  <input required type="text" inputMode="numeric" value={newForecast.amount} onChange={e => setNewForecast({...newForecast, amount: maskCurrency(e.target.value, newForecast.type)})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl px-4 lg:px-6 py-3 lg:py-4 font-black outline-none focus:border-[#79e34c] transition-all text-sm" placeholder="R$ 0,00" />
                </div>
                <div>
                  <label className="block text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Data Estimada</label>
                  <input required type="date" value={newForecast.date} onChange={e => setNewForecast({...newForecast, date: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl px-4 lg:px-6 py-3 lg:py-4 text-slate-800 font-bold outline-none focus:border-[#79e34c] transition-all text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Categoria</label>
                <select value={newForecast.category} onChange={e => setNewForecast({...newForecast, category: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl px-4 lg:px-6 py-3 lg:py-4 text-slate-800 font-bold outline-none focus:border-[#79e34c] transition-all text-sm">
                  {categories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <button type="submit" className="w-full bg-slate-800 hover:bg-black text-white font-black py-4 lg:py-5 rounded-xl lg:rounded-3xl shadow-xl transition-all transform active:scale-95 uppercase tracking-widest text-xs lg:text-sm">
                Salvar Previsão
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Box Modal */}
      {showBoxModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl lg:rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-5 lg:p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-slate-800 uppercase tracking-tight text-xs lg:text-sm">Nova Reserva</h3>
              <button onClick={() => setShowBoxModal(false)} className="text-slate-400 hover:text-slate-800">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddBox} className="p-6 lg:p-8 space-y-4">
              <div>
                <label className="block text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome da Caixinha</label>
                <input autoFocus required type="text" value={newBox.name} onChange={e => setNewBox({...newBox, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-[#79e34c] transition-all text-sm" placeholder="Ex: Viagem, Emergência..." />
              </div>
              <div>
                <label className="block text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Meta (Opcional)</label>
                <input type="text" inputMode="numeric" value={newBox.target} onChange={e => setNewBox({...newBox, target: maskCurrency(e.target.value, TransactionType.INCOME)})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-[#79e34c] transition-all text-sm" placeholder="R$ 0,00" />
              </div>
              <div>
                <label className="block text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tipo</label>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => setNewBox({...newBox, type: 'savings'})} className={`p-2 rounded-xl text-xs font-bold border transition-all ${newBox.type === 'savings' ? 'bg-[#79e34c]/20 border-[#79e34c] text-slate-900' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>Objetivo</button>
                  <button type="button" onClick={() => setNewBox({...newBox, type: 'emergency'})} className={`p-2 rounded-xl text-xs font-bold border transition-all ${newBox.type === 'emergency' ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>Emergência</button>
                  <button type="button" onClick={() => setNewBox({...newBox, type: 'investment'})} className={`p-2 rounded-xl text-xs font-bold border transition-all ${newBox.type === 'investment' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>Investimento</button>
                </div>
              </div>
              <button type="submit" className="w-full bg-[#79e34c] text-slate-900 font-black py-4 rounded-xl shadow-lg shadow-[#79e34c]/10 hover:scale-[1.02] transition-all uppercase text-[10px] tracking-widest">
                Criar Caixinha
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Box Operation Modal */}
      {showBoxOperationModal && selectedBox && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl lg:rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-5 lg:p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-black text-slate-800 uppercase tracking-tight text-xs lg:text-sm">{boxOperationType === 'deposit' ? 'Guardar Dinheiro' : 'Resgatar Dinheiro'}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{selectedBox.name}</p>
              </div>
              <button onClick={() => setShowBoxOperationModal(false)} className="text-slate-400 hover:text-slate-800">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleBoxOperation} className="p-6 lg:p-8 space-y-4">
              <div>
                <label className="block text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Valor</label>
                <input autoFocus required type="text" inputMode="numeric" value={boxOperationAmount} onChange={e => setBoxOperationAmount(maskCurrency(e.target.value, TransactionType.INCOME))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-[#79e34c] transition-all text-xl font-black text-slate-800" placeholder="R$ 0,00" />
              </div>
              <button type="submit" className={`w-full font-black py-4 rounded-xl shadow-lg hover:scale-[1.02] transition-all uppercase text-[10px] tracking-widest ${boxOperationType === 'deposit' ? 'bg-[#79e34c] text-slate-900 shadow-[#79e34c]/10' : 'bg-slate-800 text-white'}`}>
                Confirmar {boxOperationType === 'deposit' ? 'Depósito' : 'Resgate'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl lg:rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-5 lg:p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-slate-800 uppercase tracking-tight text-xs lg:text-sm">Nova Categoria</h3>
              <button onClick={() => setShowAddCategoryModal(false)} className="text-slate-400 hover:text-slate-800">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddCategory} className="p-6 lg:p-8 space-y-4">
              <div>
                <label className="block text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome</label>
                <input autoFocus required type="text" value={newCat.name} onChange={e => setNewCat({...newCat, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-[#79e34c] transition-all text-sm" placeholder="Ex: Software SaaS" />
              </div>
              <div>
                <label className="block text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Grupo DRE</label>
                <select value={newCat.group} onChange={e => setNewCat({...newCat, group: e.target.value as CategoryGroup})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-[#79e34c] transition-all text-sm">
                  {Object.entries(CategoryGroup).map(([key, value]) => (
                    <option key={key} value={value}>{value}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="w-full bg-[#79e34c] text-slate-900 font-black py-4 rounded-xl shadow-lg shadow-[#79e34c]/10 hover:scale-[1.02] transition-all uppercase text-[10px] tracking-widest">
                Salvar Categoria
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add SubCategory Modal */}
      {showAddSubCategoryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl lg:rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-5 lg:p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-slate-800 uppercase tracking-tight text-xs lg:text-sm">Nova Subcategoria</h3>
              <button onClick={() => setShowAddSubCategoryModal(false)} className="text-slate-400 hover:text-slate-800">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddSubCategory} className="p-6 lg:p-8 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Pertencente a:</span>
                <span className="font-black text-slate-800 text-sm">{newTx.category}</span>
              </div>
              <div>
                <label className="block text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome da Subcategoria</label>
                <input autoFocus required type="text" value={newSubCat} onChange={e => setNewSubCat(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-[#79e34c] transition-all text-sm" placeholder="Ex: Facebook Ads" />
              </div>
              <button type="submit" className="w-full bg-[#79e34c] text-slate-900 font-black py-4 rounded-xl shadow-lg shadow-[#79e34c]/10 hover:scale-[1.02] transition-all uppercase text-[10px] tracking-widest">
                Salvar Subcategoria
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const NavItem = ({ active, onClick, icon, label, collapsed }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, collapsed: boolean }) => (
  <button 
    onClick={onClick} 
    className={`
      w-full flex items-center gap-4 px-5 py-3 lg:py-4 rounded-xl lg:rounded-2xl transition-all duration-300 group 
      ${active ? 'bg-[#79e34c] text-slate-900 shadow-lg shadow-[#79e34c]/20 scale-[1.02]' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-800'}
    `}
  >
    <span className={`${active ? 'text-slate-900' : 'text-slate-400 group-hover:text-[#79e34c]'} transition-colors`}>{icon}</span>
    {!collapsed && <span className="font-black text-[10px] lg:text-xs uppercase tracking-widest truncate">{label}</span>}
  </button>
);

const StatCard = ({ title, value, icon, color }: { title: string, value: string, icon: React.ReactNode, color: string }) => (
  <div className={`bg-white p-5 lg:p-8 rounded-2xl lg:rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group cursor-default`}>
    <div className="flex justify-between items-start mb-4 lg:mb-8">
      <div className={`${color} p-3 lg:p-4 rounded-xl lg:rounded-2xl group-hover:rotate-12 transition-transform duration-500`}>{icon}</div>
      <span className="text-slate-300 text-[9px] lg:text-[10px] font-black uppercase tracking-widest">{title}</span>
    </div>
    <div className="text-2xl lg:text-4xl font-black text-slate-900 tracking-tighter tabular-nums">{value}</div>
  </div>
);

const DRELine = ({ label, value, isNegative = false, bold = false, highlight = false }: { label: string, value: number, isNegative?: boolean, bold?: boolean, highlight?: boolean }) => (
  <div className={`
    flex justify-between items-center px-4 lg:px-6 py-3 lg:py-4 rounded-xl lg:rounded-2xl transition-all hover:bg-slate-50/80 
    ${bold ? 'font-black text-slate-900' : 'text-slate-500 font-bold'} 
    ${highlight ? 'bg-[#79e34c]/10 border-l-4 border-[#79e34c] shadow-sm' : ''}
  `}>
    <span className="text-[10px] lg:text-xs uppercase tracking-widest">{label}</span>
    <span className={`tabular-nums ${isNegative ? 'text-rose-500' : ''} ${bold ? 'text-sm lg:text-lg' : 'text-[11px] lg:text-sm'}`}>
      {isNegative ? '-' : ''} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(value))}
    </span>
  </div>
);

export default App;