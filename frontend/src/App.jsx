import { useState, useEffect } from 'react';
import { LayoutDashboard, Folder, Plus, CheckCircle2, Circle, Zap, User as UserIcon, LogOut, ShieldAlert, Users, Trash2, ArrowRightLeft, Loader2, Menu, X } from 'lucide-react';
import logoUrl from '/logo.svg';

const API_URL = import.meta.env.DEV ? 'http://localhost:5000/api' : '/api';

function App() {
  const [user, setUser] = useState(null);
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [isInitializing, setIsInitializing] = useState(true);

  // --- STAN DLA TELEFONÓW ---
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [adminView, setAdminView] = useState('admin');
  const [folders, setFolders] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activeFolderId, setActiveFolderId] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [newUserForm, setNewUserForm] = useState({ username: '', password: '' });

  const currentLevel = user && user.role !== 'admin' ? Math.floor(user.xp / 100) + 1 : "MAX";
  const xpProgress = user && user.role !== 'admin' ? (user.xp % 100) : 100;

  useEffect(() => {
    fetch(`${API_URL}/auth/me`, { credentials: 'include' })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Brak sesji');
      })
      .then(data => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setIsInitializing(false)); 
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authForm),
      credentials: 'include' 
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) alert(data.error);
        else setUser(data);
      });
  };

  const logout = () => {
    fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' })
      .then(() => {
        setUser(null);
        setFolders([]);
        setTasks([]);
        setAllUsers([]);
        setAdminView('admin');
        setIsMobileMenuOpen(false);
      });
  };

  useEffect(() => {
    if (!user) return;
    
    if (user.role === 'admin') {
      fetch(`${API_URL}/admin/users`, { credentials: 'include' })
        .then(res => res.json())
        .then(setAllUsers);
    } 
    
    fetch(`${API_URL}/folders/${user.id}`, { credentials: 'include' }).then(res => res.json()).then(data => {
      setFolders(data);
      if (data.length > 0) setActiveFolderId(data[0].id);
    });
    fetch(`${API_URL}/tasks/${user.id}`, { credentials: 'include' }).then(res => res.json()).then(setTasks);
    
  }, [user]);

  const handleCreateUser = (e) => {
    e.preventDefault();
    fetch(`${API_URL}/admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUserForm),
      credentials: 'include'
    }).then(res => res.json()).then(data => {
        if (data.error) alert(data.error);
        else { setAllUsers([...allUsers, data.user]); setNewUserForm({ username: '', password: '' }); }
      });
  };

  const deleteUserFromDB = (id) => {
    if (!confirm("OSTRZEŻENIE: Trwałe usunięcie danych. Kontynuować?")) return;
    fetch(`${API_URL}/admin/users/${id}`, { method: 'DELETE', credentials: 'include' })
      .then(() => setAllUsers(allUsers.filter(u => u.id !== id)));
  };

  const refreshUserXP = () => {
    if (user.role === 'admin') return;
    fetch(`${API_URL}/user/${user.id}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setUser({ ...user, xp: data.xp }));
  };

  const addFolder = (e) => {
    e.preventDefault();
    fetch(`${API_URL}/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newFolderName, user_id: user.id }),
      credentials: 'include'
    }).then(res => res.json()).then(data => { 
      setFolders([...folders, data]); 
      setNewFolderName(''); 
      setActiveFolderId(data.id); 
      setIsMobileMenuOpen(false); // Zamknij menu po utworzeniu folderu
    });
  };

  const addTask = (e) => {
    e.preventDefault();
    fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTaskTitle, folder_id: activeFolderId }),
      credentials: 'include'
    }).then(res => res.json()).then(data => { setTasks([...tasks, data]); setNewTaskTitle(''); });
  };

  const toggleTask = (task) => {
    fetch(`${API_URL}/tasks/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !task.completed }),
      credentials: 'include'
    }).then(res => res.json()).then(updated => {
      setTasks(tasks.map(t => t.id === task.id ? updated : t));
      if (!task.completed) refreshUserXP(); 
    });
  };

  // ==========================================
  // EKRAN ŁADOWANIA SESJI
  // ==========================================
  if (isInitializing) {
    return (
      <div className="flex h-screen bg-[#0f1115] items-center justify-center">
        <Loader2 className="animate-spin text-violet-500" size={48} />
      </div>
    );
  }

  // ==========================================
  // EKRAN LOGOWANIA
  // ==========================================
  if (!user) {
    return (
      <div className="flex h-screen bg-[#0f1115] items-center justify-center font-sans relative overflow-hidden px-4">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-[100px]" />
        <div className="bg-[#161920]/90 p-8 md:p-10 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-xl max-w-md w-full z-10 text-white text-center">
          <img src={logoUrl} alt="Workspace Logo" className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-6 rounded-3xl shadow-2xl shadow-violet-500/30" />
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Prywatny Workspace</h1>
          <p className="text-slate-400 text-sm md:text-base mb-8">Zaloguj się, aby kontynuować. Brak publicznej rejestracji.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input placeholder="Nazwa użytkownika (lub Admin)" value={authForm.username} onChange={e => setAuthForm({...authForm, username: e.target.value})} className="w-full bg-[#0f1115] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-violet-500 transition-colors" />
            <input type="password" placeholder="Hasło" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full bg-[#0f1115] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-violet-500 transition-colors" />
            <button className="w-full bg-violet-600 hover:bg-violet-500 py-3 rounded-xl font-bold transition-all cursor-pointer">Zaloguj się</button>
          </form>
        </div>
      </div>
    );
  }

  // Komponent dla górnego paska na urządzeniach mobilnych
  const MobileHeader = () => (
    <div className="md:hidden flex items-center justify-between p-4 bg-[#161920] border-b border-white/5 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded-lg" />
        <span className="font-bold text-white text-lg">Workspace</span>
      </div>
      <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-300 cursor-pointer">
        <Menu size={28} />
      </button>
    </div>
  );

  // Komponent przyciemnianego tła dla menu mobilnego
  const MobileOverlay = () => (
    isMobileMenuOpen && (
      <div 
        className="fixed inset-0 bg-black/70 z-30 backdrop-blur-sm md:hidden" 
        onClick={() => setIsMobileMenuOpen(false)} 
      />
    )
  );

  // ==========================================
  // EKRAN PANEL ADMINISTRATORA
  // ==========================================
  if (user.role === 'admin' && adminView === 'admin') {
    return (
      <div className="flex flex-col md:flex-row h-screen bg-[#0f1115] text-slate-200 font-sans overflow-hidden">
        <MobileHeader />
        <MobileOverlay />

        <aside className={`fixed md:relative z-40 h-full w-72 md:w-80 bg-[#1a0e0e] border-r border-rose-500/20 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <div className="md:hidden flex justify-end p-4 pb-0">
            <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-white cursor-pointer"><X size={24}/></button>
          </div>
          <div className="p-6 border-b border-rose-500/20 bg-rose-500/10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-rose-400">
                <ShieldAlert size={20} />
                <span className="font-bold">SYSTEM ADMIN</span>
              </div>
              <button onClick={logout} className="text-slate-500 hover:text-rose-400 cursor-pointer"><LogOut size={18}/></button>
            </div>
          </div>
          <div className="p-4 flex items-center gap-3 text-rose-300 bg-rose-500/5 m-4 rounded-xl border border-rose-500/20">
            <Users size={18} /> Zarządzanie kontami
          </div>
          <div className="mt-auto p-4 border-t border-rose-500/20">
            <button onClick={() => { setAdminView('todo'); setIsMobileMenuOpen(false); }} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white p-3 rounded-xl font-bold hover:opacity-90 transition-opacity cursor-pointer">
              <ArrowRightLeft size={18} /> Przejdź do Moich Zadań
            </button>
          </div>
        </aside>

        <main className="flex-1 p-6 md:p-12 overflow-y-auto">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-6">Dodaj użytkownika</h2>
            <form onSubmit={handleCreateUser} className="bg-[#161920] p-5 md:p-6 rounded-2xl border border-white/5 mb-10 flex flex-col md:flex-row gap-4">
              <input placeholder="Nowy Nick" value={newUserForm.username} onChange={e => setNewUserForm({...newUserForm, username: e.target.value})} className="flex-1 bg-[#0f1115] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-rose-500 text-white" />
              <input type="password" placeholder="Hasło" value={newUserForm.password} onChange={e => setNewUserForm({...newUserForm, password: e.target.value})} className="flex-1 bg-[#0f1115] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-rose-500 text-white" />
              <button type="submit" className="bg-rose-600 hover:bg-rose-500 text-white py-3 md:px-8 rounded-xl font-bold transition-all cursor-pointer">Utwórz</button>
            </form>
            <h3 className="text-xl font-bold text-slate-300 mb-4">Istniejący użytkownicy</h3>
            <div className="bg-[#161920] rounded-2xl border border-white/5 overflow-hidden">
              {allUsers.map(u => (
                <div key={u.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border-b border-white/5 gap-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-800 p-2 rounded-lg"><UserIcon size={16} className="text-slate-400"/></div>
                    <span className="font-medium text-white">{u.username}</span>
                  </div>
                  <div className="flex items-center justify-between md:justify-end gap-4">
                    <span className="text-xs md:text-sm font-bold text-violet-400 bg-violet-500/10 px-3 py-1 rounded-full">{u.xp} XP (Poziom {Math.floor(u.xp/100)+1})</span>
                    <button onClick={() => deleteUserFromDB(u.id)} className="p-2 bg-rose-500/10 text-rose-400 rounded-lg hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ==========================================
  // EKRAN APLIKACJI TO-DO
  // ==========================================
  const activeTasks = tasks.filter(t => t.folder_id === activeFolderId);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#0f1115] text-slate-200 font-sans overflow-hidden">
      <MobileHeader />
      <MobileOverlay />

      <aside className={`fixed md:relative z-40 h-full w-72 md:w-80 bg-[#161920] border-r border-white/5 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="md:hidden flex justify-end p-4 pb-0">
          <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-white cursor-pointer"><X size={24}/></button>
        </div>
        
        <div className="hidden md:flex p-6 border-b border-white/5 items-center gap-3 bg-[#0f1115]/40">
          <img src={logoUrl} alt="Workspace Logo" className="w-10 h-10 rounded-xl shadow-lg shadow-violet-500/20" />
          <h1 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-400">Workspace</h1>
        </div>

        <div className="p-6 border-b border-white/5 bg-gradient-to-b from-violet-500/10 to-transparent">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-[#1e222b] p-2 rounded-full"><UserIcon size={18} className={user.role === 'admin' ? "text-rose-400" : "text-violet-400"}/></div>
              <span className="font-bold text-white">{user.username}</span>
            </div>
            <button onClick={logout} className="text-slate-500 hover:text-rose-400 cursor-pointer"><LogOut size={18}/></button>
          </div>
          <div className="bg-[#0f1115] rounded-xl p-3 border border-white/5 shadow-inner">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Poziom {currentLevel}</span>
              <span className="text-slate-400 text-xs">{user.role === 'admin' ? 'Nieskończone' : user.xp} XP</span>
            </div>
            <div className="h-2 w-full bg-[#1e222b] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-1000 ease-out" style={{ width: `${xpProgress}%` }} />
            </div>
          </div>
          {user.role === 'admin' && (
             <button onClick={() => { setAdminView('admin'); setIsMobileMenuOpen(false); }} className="mt-4 w-full flex items-center justify-center gap-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 p-2 rounded-lg text-sm font-bold hover:bg-rose-500/20 transition-colors cursor-pointer">
               <ShieldAlert size={16} /> Wróć do Panelu Admina
             </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {folders.map(folder => (
            <button 
              key={folder.id} 
              onClick={() => { setActiveFolderId(folder.id); setIsMobileMenuOpen(false); }} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${activeFolderId === folder.id ? 'bg-violet-600/20 text-white border border-violet-500/30' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
            >
              <Folder size={18} className={activeFolderId === folder.id ? "text-violet-400" : ""} />
              <span className="font-medium text-left truncate flex-1">{folder.name}</span>
            </button>
          ))}
        </div>
        <form onSubmit={addFolder} className="p-4 md:p-6 border-t border-white/5 relative">
          <input placeholder="Nowy projekt..." value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} className="w-full bg-[#1e222b] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-violet-500 text-sm text-white" />
        </form>
      </aside>

      <main className="flex-1 flex flex-col relative p-4 md:p-12 overflow-y-auto">
        {activeFolderId ? (
          <div className="max-w-4xl w-full mx-auto pb-20">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-6 md:mb-8 mt-2 md:mt-0">{folders.find(f => f.id === activeFolderId)?.name}</h2>
            <form onSubmit={addTask} className="mb-6 md:mb-8 flex flex-col md:flex-row gap-3">
              <input placeholder="Dodaj zadanie (+25 XP)" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} className="flex-1 bg-[#161920] border border-white/10 rounded-xl px-5 py-3 md:py-4 outline-none focus:border-violet-500 text-base md:text-lg text-white" />
              <button type="submit" className="bg-white text-black py-3 md:py-0 md:px-8 rounded-xl font-bold hover:bg-slate-200 transition-all active:scale-95 cursor-pointer">Dodaj</button>
            </form>
            <ul className="space-y-3">
              {activeTasks.map(task => (
                <li key={task.id} className={`flex items-center gap-3 md:gap-4 p-4 md:p-5 rounded-xl border transition-all ${task.completed ? 'bg-[#161920]/50 border-white/5 opacity-50' : 'bg-[#161920] border-white/10 hover:border-violet-500/50'}`}>
                  <button onClick={() => toggleTask(task)} className="cursor-pointer shrink-0">
                    {task.completed ? <CheckCircle2 className="text-emerald-500" size={24} /> : <Circle className="text-slate-600 hover:text-violet-400" size={24} />}
                  </button>
                  <span className={`text-base md:text-lg flex-1 ${task.completed ? 'line-through text-slate-500' : 'text-white'}`}>{task.title}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="m-auto text-center text-slate-500 px-4">Wybierz folder z menu, aby zacząć pracę.</div>
        )}
      </main>
    </div>
  );
}

export default App;