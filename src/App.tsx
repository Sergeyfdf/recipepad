import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, PlusCircle, User, Search, Image as ImageIcon, Trash2, BookmarkPlus, Pencil, ListChecks } from 'lucide-react'
import './App.css'

// ----------------------
// Helpers & Storage
// ----------------------
const STORAGE_KEY = 'recipepad.v1.recipes'
const SETTINGS_KEY = 'recipepad.settings'
const THEME_KEY = 'recipepad.theme'
const CATS = ['Кондитерка', 'Хлеб', "Торты", "Пироги", "Печенье"] as const
const GITHUB_USERNAME = 'Sergeyfdf';
const GITHUB_REPO = 'recipepad';
const SETTINGS_FILE_PATH = 'settings.json';
const GITHUB_TOKEN = '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';


type Part = {
  id: string
  title: string
  ingredients: string[]
  steps: string[]
}

type GlobalSettings = {
  notificationType: 'website' | 'telegram';
  adminTelegramToken: string;
  adminTelegramChatId: string;
}


type AppSettings = {
  telegramEnabled: boolean
  telegramToken: string
  telegramChatId: string
  soundEnabled: boolean
}

type Recipe = {
  id: string
  title: string
  description?: string
  // старые поля делаем необязательными (для совместимости)
  ingredients?: string[]
  steps?: string[]
  cover?: string
  createdAt: number
  favorite?: boolean
  categories?: string[]
  done?: boolean   
  // новые разделы
  parts?: Part[]
}

type ShoppingItem = {
  key: string      // нормализованное имя (ключ для слияния)
  name: string     // отображаемое имя
  unit?: string    // единица (шт, г, мл и т.п.)
  qty?: number     // сумма количеств
  lines: string[]  // исходные строки, если не смогли сложить
}

const defaultSettings: AppSettings = {
  telegramEnabled: false,
  telegramToken: '',
  telegramChatId: '',
  soundEnabled: true
}




async function loadGlobalSettings(): Promise<GlobalSettings> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${SETTINGS_FILE_PATH}`,
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      const content = atob(data.content); // Декодируем base64
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Ошибка загрузки настроек:', error);
  }
  
  // Возвращаем настройки по умолчанию при ошибке
  return {
    notificationType: 'website',
    adminTelegramToken: '',
    adminTelegramChatId: ''
  };
}

// Функция сохранения настроек на GitHub
async function saveGlobalSettings(settings: GlobalSettings): Promise<boolean> {
  try {
    // Сначала получаем текущий SHA файла
    const currentFile = await fetch(
      `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${SETTINGS_FILE_PATH}`,
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );
    
    let sha = '';
    if (currentFile.ok) {
      const data = await currentFile.json();
      sha = data.sha;
    }
    
    // Обновляем файл
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${SETTINGS_FILE_PATH}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'Update notification settings',
          content: btoa(JSON.stringify(settings, null, 2)),
          sha: sha
        })
      }
    );
    
    return response.ok;
  } catch (error) {
    console.error('Ошибка сохранения настроек:', error);
    return false;
  }
}




function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? {...defaultSettings, ...JSON.parse(raw)} : defaultSettings
  } catch {
    return defaultSettings
  }
}

function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}



function loadRecipes(): Recipe[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const arr: Recipe[] = raw ? JSON.parse(raw) : []
    // миграция: гарантируем наличие categories
    return arr.map(r => ({
      ...r,
      categories: Array.isArray(r.categories) ? r.categories : [],
      parts: Array.isArray((r as any).parts) ? (r as any).parts : [],
      ingredients: Array.isArray((r as any).ingredients) ? (r as any).ingredients : [],
      steps: Array.isArray((r as any).steps) ? (r as any).steps : [],
      done: typeof (r as any).done === 'boolean' ? (r as any).done : false,
    }))    
  } catch {
    return []
  }
}

function saveRecipes(recs: Recipe[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recs))
}


function hasParts(r: Recipe) {
  return Array.isArray(r.parts) && r.parts.length > 0
}
function allIngredients(r: Recipe): string[] {
  return hasParts(r) ? r.parts!.flatMap(p => p.ingredients) : (r.ingredients || [])
}
function allSteps(r: Recipe): string[] {
  return hasParts(r) ? r.parts!.flatMap(p => p.steps) : (r.steps || [])
}



function parseIngredient(line: string) {
  const raw = line.trim().replace(/\s+/g, ' ')
  // примеры: "2 шт яйца", "1.5 л молока", "200 г муки", "2 картофелины"
  const m = raw.match(/^(\d+(?:[.,]\d+)?)\s*([^\d\s]+)?\s*(.*)$/i)
  if (!m) return { name: raw.toLowerCase(), unit: undefined, qty: undefined, key: raw.toLowerCase(), display: raw }

  const q = parseFloat(m[1].replace(',', '.'))
  let unit = normUnit(m[2] || undefined)
  let rest = (m[3] || '').trim()

  // если после единицы ничего не осталось — считаем, что это было название
  if (!rest) { rest = unit || ''; unit = undefined }

  const name = rest.toLowerCase()
  const key = name
  return { name, unit, qty: isFinite(q) ? q : undefined, key, display: raw }
}

// Сложить одинаковые позиции (одинаковый key и unit)
function mergeIngredients(all: string[]): ShoppingItem[] {
  const map = new Map<string, ShoppingItem>()
  for (const line of all) {
    const p = parseIngredient(line)
    const k = p.key
    if (!k) continue
    if (!map.has(k)) {
      map.set(k, { key: k, name: p.key, unit: p.unit, qty: p.qty, lines: p.qty ? [] : [p.display] })
    } else {
      const it = map.get(k)!
      if (p.qty && (!it.unit || it.unit === p.unit)) {
        it.qty = (it.qty || 0) + p.qty
        it.unit = it.unit || p.unit
      } else {
        it.lines.push(p.display)
      }
    }
  }
  // первая буква заглавной
  return Array.from(map.values()).map(it => ({ ...it, name: it.name.charAt(0).toUpperCase() + it.name.slice(1) }))
}

function formatItem(it: ShoppingItem) {
  const cap = (s: string) => s ? s[0].toUpperCase() + s.slice(1) : s

  const qtyNum = typeof it.qty === 'number' ? +it.qty.toFixed(2) : null
  const unit = it.unit || ''

  // без пробела для коротких единиц: г, кг, мл, л
  const tightUnits = ['г', 'кг', 'мл', 'л']
  const qtyUnit =
    qtyNum !== null
      ? (unit ? (tightUnits.includes(unit) ? `${qtyNum}${unit}` : `${qtyNum} ${unit}`) : String(qtyNum))
      : ''

  // ТЕПЕРЬ ФОРМАТ: "Мука: 530г"
  const base = qtyUnit ? `${cap(it.name)}: ${qtyUnit}` : cap(it.name)

  // Показываем скобки только если там реально есть отличающиеся варианты
  const clean = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase()
  const leftovers = Array.from(new Set(it.lines.map(s => s.trim())))
    .filter(s => s && clean(s) !== clean(base))

  return leftovers.length ? `${base} (${leftovers.join('; ')})` : base
}




function normUnit(u?: string) {
  if (!u) return undefined
  const x = u.replace(/\./g, '').toLowerCase()
  const map: Record<string, string> = {
    'гр': 'г', 'грамм': 'г', 'грамма': 'г', 'граммов': 'г',
    'шт': 'шт', 'штука': 'шт', 'штуки': 'шт',
    'мл': 'мл', 'л': 'л', 'кг': 'кг'
  }
  return map[x] || x
}

// Более надёжное получение IP
async function getUserIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Не удалось получить IP:', error);
    return 'unknown';
  }
}

async function checkIfAdmin(): Promise<boolean> {
  const adminIPs = [
    '178.158.192.200' // ← ЗАМЕНИТЕ на ваш реальный IP!
  ];
  
  try {
    const userIP = await getUserIP();
    return adminIPs.includes(userIP);
  } catch (error) {
    return false;
  }
}

function cls(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export default function App() {
  const [view, setView] = useState<"feed" | "add" | "profile" | "detail" | "edit" | "list" | "orders" | "settings">("feed");
  const [recipes, setRecipes] = useState<Recipe[]>(loadRecipes())
  const [currentId, setCurrentId] = useState<string | null>(null)
  const getSystemTheme = () => (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light'
  const [theme, setTheme] = useState<string>(() => localStorage.getItem(THEME_KEY) || getSystemTheme())
  const [orders, setOrders] = useState<{ title: string; time: string }[]>([]);
  const [settings, setSettings] = useState<AppSettings>(loadSettings())
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    notificationType: 'website',
    adminTelegramToken: '',
    adminTelegramChatId: ''
  });
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => saveRecipes(recipes), [recipes])
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])
  useEffect(() => saveSettings(settings), [settings])
  useEffect(() => {
    loadGlobalSettings().then(settings => {
      setGlobalSettings(settings);
      
      // Проверяем, админ ли это (например, по IP или другому признаку)
      // Здесь простой пример - можно сделать сложнее
      checkIfAdmin().then(userIsAdmin => {
        setIsAdmin(userIsAdmin);
      });
    });
  }, []);

  const onAdd = (r: Recipe) => setRecipes((prev: Recipe[]) => [r, ...prev])
  const onUpdate = (r: Recipe) => setRecipes((prev: Recipe[]) => prev.map(x => (x.id === r.id ? r : x)))
  const onDelete = (id: string) => setRecipes((prev: Recipe[]) => prev.filter(r => r.id !== id))
  const onToggleFav = (id: string) => setRecipes((prev: Recipe[]) => prev.map(r => (r.id === id ? { ...r, favorite: !r.favorite } : r)))

  const current = useMemo(() => recipes.find(r => r.id === currentId) || null, [recipes, currentId])
  const tabForBar: 'feed' | 'add' | 'profile' =
    (view === 'feed' || view === 'add' || view === 'profile') ? view : 'feed'

  const sendOrderNotification = async (order: { title: string; time: string }) => {
    if (globalSettings.notificationType === 'telegram') {
      // Отправляем в Telegram админу
      sendToTelegram(
        order, 
        globalSettings.adminTelegramToken, 
        globalSettings.adminTelegramChatId
      );
    } else {
      // Показываем на сайте
      if (settings.soundEnabled) {
        playNotificationSound();
      }
      // Добавляем в локальные заказы
      setOrders(prev => [...prev, order]);
    }
  };

  const handleOrder = (title: string) => {
    const newOrder = { title, time: new Date().toLocaleString() };
    sendOrderNotification(newOrder);
    
    // Если уведомления на сайте, добавляем в локальный список
    if (globalSettings.notificationType === 'website') {
      setOrders(prev => [...prev, newOrder]);
    }
  };

  // Функция для админа чтобы изменить настройки
  const updateGlobalSettings = async (newSettings: GlobalSettings) => {
    const success = await saveGlobalSettings(newSettings);
    if (success) {
      setGlobalSettings(newSettings);
      alert('Настройки обновлены!');
    } else {
      alert('Ошибка сохранения настроек');
    }
  };

  const playNotificationSound = () => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbVtfdJivrJBhNjVgodDbq2EcBSt5t/LInE8PABZsqfXSrGwhABk3f7Xr2rVqHAAACERztfLPr2keAAAGM3Gv8N+8cyIAAAQrZ6vw5cJ5JgAABB9ep/DqyIUqAAAEG1uh7+vNiywAAAQZU5zt7NGRMAAABBdRl+vt1Jk1AAAEFU+V6+/WnDcAAAQUS5Hq7tifOQAABBJJj+nu2qM8AAAEEUaM6O7bpT4AAAQQQ4rn7t2oQQAABA9Ah+bt3qlDAAAEDj6E5O3frEUAAAQNO4Hi7OCvSAAABA05f+Hr4bJMAAAEDDd83+ritE4AAAQLNnrd6uO2UAAABAs0eNzp47hSAAAECjJ22ujkulQAAAQJMHzZ5+W9WAAABAkvedfm5sBcAAAECS131ubnwmEAAAQILHbU5ejDZAAABAgsdNPm6cVnAAAECSx00+bqx2kAAAQILHPS5uvIbQAABAksctHm7MpwAAAECSxx0ObtzHIAAAQKLHDP5u7NdAAABAosb87m7852AAAECyxtzebw0HgAAAQLLGzM5vHRegAABAssa8vm8tJ8AAAECyxqyubz1H4AAAQLLGnJ5vTWgAAABAwsacjm9diCAAAEDCxox+b22oQAAAQMLGfG5vjciAAABA0sZsXm+d6LAAAEDixlw+b74I4AAAQOLGTB5v3ikAAABA8sY8Dm/+SSAAAEDyxiwOcB5pQAAAQQLGHA5wPpmAAABBEsYMDnBeucAAAEEixfwOcH7J8AAAQSLF7A5wnuogAABBMuXcDnC/CkAAAEFCxcwOcO8qYAAAQVLlvA5xD0qQAABBYsWsDnEvasAAAEFyxZwOcU+LEAAAQYLFjA5xb6tAAABBksV8DnGPy4AAAEGixWwOcb/sAAAAQbLFXA5x4AxAAABB0sVMDnIQTIAAAEFQ==')
      audio.volume = 0.3
      audio.play().catch(() => {}) // Игнорируем ошибки автоплея
    } catch (error) {
      console.log('Не удалось воспроизвести звук')
    }
  }
  
  // Отправка в Telegram
  const sendToTelegram = async (order: { title: string; time: string }, token: string, chatId: string) => {
    try {
      const message = `📦 НОВЫЙ ЗАКАЗ ИЗ RECIPEPAD!\n\n🍳 Блюдо: ${order.title}\n⏰ Время: ${order.time}\n📱 Отправлено с сайта`
      
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML'
        })
      })
      
      if (!response.ok) {
        console.error('Ошибка отправки в Telegram')
      }
    } catch (error) {
      console.error('Ошибка подключения к Telegram:', error)
    }
  }

  return (
    <div className="app">
      <Header
        theme={theme}
        setTheme={setTheme}
        onGoOrders={() => setView("orders")}
        onGoList={() => setView('list')}
      />

      <main className="container main">
        <AnimatePresence mode="wait">
          {view === 'feed' && (
            <motion.div key="feed" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <Feed
                recipes={recipes}
                onDelete={(id) => onDelete(id)}
                onToggleFav={(id) => onToggleFav(id)}
                onOpen={(id) => {
                  setCurrentId(id)
                  setView('detail')
                }}
                onOrder={handleOrder}
              />
            </motion.div>
          )}
          {view === "orders" && <OrdersPage orders={orders} />}
          {view === 'add' && (
            <motion.div key="add" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <Editor
                onSave={(r) => {
                  onAdd(r)
                  setView('feed')
                }}
                onCancel={() => setView('feed')}
              />
            </motion.div>
          )}

          {view === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <Profile 
                recipes={recipes} 
                globalSettings={globalSettings}
                isAdmin={isAdmin}
                onSettingsUpdate={updateGlobalSettings}
              />
            </motion.div>
          )}

          {view === 'detail' && current && (
            <motion.div key="detail" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <Detail
                r={current}
                onBack={() => setView('feed')}
                onEdit={() => setView('edit')}
                onDelete={() => {
                  if (confirm('Удалить рецепт?')) {
                    onDelete(current.id)
                    setView('feed')
                    setCurrentId(null)
                  }
                }}
                onToggleFav={() => onToggleFav(current.id)}
              />
            </motion.div>
          )}

          {view === 'edit' && current && (
            <motion.div key="edit" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <Editor
                initial={current}
                onSave={(r) => {
                  onUpdate(r)
                  setView('detail')
                }}
                onCancel={() => setView('detail')}
              />
            </motion.div>
          )}

          {view === 'list' && (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <ShoppingList recipes={recipes} />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      <TabBar tab={tabForBar} setTab={(t) => setView(t)} />
    </div>
  )
}


// ----------------------
// Header
// ----------------------
function Header({
  theme,
  setTheme,
  onGoOrders,
  onGoList
}: {
  theme: string;
  setTheme: (v: string) => void;
  onGoOrders: () => void;
  onGoList: () => void;
}) {
  return (
    <header className="header">
      <div className="container header__inner">
        <div className="brand">RecipePad</div>
        <div className="header__actions">
          <button className="btn btn-ghost" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button className="btn btn-primary hide-sm" onClick={onGoOrders}>
  <PlusCircle className="icon" /> Заказы
</button>

<button className="btn" onClick={onGoList}>
  <ListChecks className="icon" /> Список
</button>
        </div>
      </div>
    </header>
  )
}

// ----------------------
// Bottom Tab Bar
// ----------------------
function TabBar({ tab, setTab }: { tab: 'feed' | 'add' | 'profile' | 'list'; setTab: (t: 'feed' | 'add' | 'profile' | 'list') => void }) {
  const items = [
    { key: 'feed', label: 'Лента', icon: Home },
    { key: 'add', label: 'Добавить', icon: PlusCircle },
    { key: 'profile', label: 'Профиль', icon: User }
  ] as const
  

  return (
    <nav className="tabbar">
      <div className="container tabbar__grid">
        {items.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)} className={cls('tabbar__btn', tab === key && 'is-active')}>
            <Icon className="icon" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}

// ----------------------
// Feed Page
// ----------------------
function Feed({ recipes, onDelete, onToggleFav, onOpen, onOrder }: { recipes: Recipe[]; onDelete: (id: string) => void; onToggleFav: (id: string) => void; onOpen: (id: string) => void; onOrder: (title: string) => void; }) {
  const [q, setQ] = useState('')
  const [onlyFav, setOnlyFav] = useState(false)

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    const base = onlyFav ? recipes.filter(r => r.favorite) : recipes
    if (!qq) return base
    return base.filter(r =>
      r.title.toLowerCase().includes(qq) ||
      (r.description || '').toLowerCase().includes(qq) ||
      allIngredients(r).some(i => i.toLowerCase().includes(qq)) ||
      allSteps(r).some(s => s.toLowerCase().includes(qq)) ||
      (r.categories || []).some(c => c.toLowerCase().includes(qq))
    )
  }, [recipes, q, onlyFav])

  return (
    <section className="section">
      <div className="toolbar">
        <div className="input input--withicon">
          <Search className="icon input__icon" />
          <input className="input__control" placeholder="Поиск по названию, тегам, ингредиентам…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <button onClick={() => setOnlyFav((v: boolean) => !v)} className={cls('btn', onlyFav ? 'btn-amber' : 'btn-ghost')} title="Показать только избранное">
          ★
        </button>
      </div>

      {filtered.length === 0 && <div className="empty">Ничего не найдено. Добавьте рецепт или измените запрос.</div>}

      <div className="cards">
        <AnimatePresence>
          {filtered.map(r => (
            <RecipeCard 
            key={r.id} 
            r={r} 
            onDelete={onDelete} 
            onToggleFav={onToggleFav} 
            onOpen={() => onOpen(r.id)}
            onOrder={() => onOrder(r.title)}  // Add this line
          />
          ))}
        </AnimatePresence>
      </div>
    </section>
  )
}

// helper: собрать 4 строки-превью (сначала ингредиенты, потом шаги)
function makePreviewLines(r: Recipe, max = 4): string[] {
  const out: string[] = []
  for (const i of allIngredients(r)) {
    if (out.length >= max) break
    out.push(`• ${i}`)
  }
  let n = 1
  for (const s of allSteps(r)) {
    if (out.length >= max) break
    out.push(`${n++}. ${s}`)
  }
  return out
}

function RecipeCard({ 
  r, 
  onDelete, 
  onToggleFav, 
  onOpen, 
  onOrder
}: { 
  r: Recipe; 
  onDelete: (id: string) => void; 
  onToggleFav: (id: string) => void; 
  onOpen: () => void;
  onOrder: () => void;
}) {
  const preview = makePreviewLines(r)
  const truncated = (allIngredients(r).length + allSteps(r).length) > preview.length

  return (
    <motion.article layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="card">
      {r.cover && (
        <div className="card__media">
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <img src={r.cover} />
        </div>
      )}
      <div className="card__body">
        <div className="card__titlebar">
          <h3 className="card__title">{r.title}</h3>
          <div className="card__actions">
            <button className={cls('iconbtn', r.favorite && 'is-fav')} title={r.favorite ? 'Убрать из избранного' : 'В избранное'} onClick={() => onToggleFav(r.id)}>
              ★
            </button>
            <button className="iconbtn danger" title="Удалить" onClick={() => onDelete(r.id)}>
              <Trash2 className="icon" />
            </button>
          </div>
        </div>
        {r.description && <p className="muted">{r.description}</p>}

        {(r.categories && r.categories.length > 0) && (
          <div className="badges">
            {r.categories.map((c, i) => (
              <span className="badge" key={i}>{c}</span>
            ))}
          </div>
        )}
        <div className="badges mt">
          <span className={`badge ${r.done ? 'status-done' : 'status-todo'}`}>
            {r.done ? 'Сделано' : 'Не сделано'}
          </span>
        </div>

        <ul className="preview-lines">
          {preview.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
          {truncated && <li className="ellipsis">…</li>}
        </ul>
        <div className="row mt">
          <button className="btn btn-ghost" onClick={onOpen}>Подробнее</button>
          <button className="btn btn-secondary" onClick={onOrder}>Заказать</button>
        </div>

        <div className="stamp">{new Date(r.createdAt).toLocaleString()}</div>
      </div>
    </motion.article>
  )
}






function OrdersPage({ orders }: { orders: { title: string; time: string }[] }) {
  return (
    <div className="page orders">
      <h2>Заказы</h2>
      {orders.length === 0 ? (
        <p>Пока нет заказов</p>
      ) : (
        <ul>
          {orders.map((o, i) => (
            <li key={i}>
              <strong>{o.title}</strong> <br />
              <small>{o.time}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}





// ----------------------
// Detail Page (полноэкранно)
// ----------------------
function Detail({ r, onBack, onEdit, onDelete, onToggleFav }: { r: Recipe; onBack: () => void; onEdit: () => void; onDelete: () => void; onToggleFav: () => void }) {
  return (
    <section className="section">
      <div className="row gap mt">
        <button className="btn btn-ghost" onClick={onBack}>← Назад</button>
        <div className="grow" />
        <button className="btn" onClick={onToggleFav}>{r.favorite ? '★ В избранном' : '☆ В избранное'}</button>
        <button className="btn" onClick={onEdit}><Pencil className="icon" /> Редактировать</button>
        <button className="btn" onClick={onDelete}>Удалить</button>
      </div>

      <div className="card mt">
        {r.cover && (
          <div className="card__media">
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <img src={r.cover} />
          </div>
        )}
        <div className="card__body">
          <h2 className="title" style={{marginTop: 0}}>{r.title}</h2>
          {r.description && <p className="muted">{r.description}</p>}

          {(r.categories && r.categories.length > 0) && (
            <div className="badges mt">
              {r.categories.map((c, i) => (
                <span className="badge" key={i}>{c}</span>
              ))}
            </div>
          )}
          <div className="badges mt">
  <span className={`badge ${r.done ? 'status-done' : 'status-todo'}`}>
    {r.done ? 'Сделано' : 'Не сделано'}
  </span>
</div>


{hasParts(r) ? (
  <div className="vstack gap mt">
    {r.parts!.map((p, idx) => (
      <div key={p.id || idx} className="card mt" style={{border:'1px solid var(--border)'}}>
        <div className="card__body">
          <div className="title" style={{marginTop:0}}>
            {p.title || `Раздел ${idx+1}`}
          </div>
          <div className="grid2 mt">
            <div>
              <div className="subtitle">Ингредиенты</div>
              <ul className="list">
                {p.ingredients.map((i, iidx) => <li key={iidx}>{i}</li>)}
              </ul>
            </div>
            <div>
              <div className="subtitle">Шаги</div>
              <ol className="list list--ordered">
                {p.steps.map((s, sidx) => <li key={sidx}>{s}</li>)}
              </ol>
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
) : (
  <div className="grid2 mt">
    <div>
      <div className="subtitle">Ингредиенты</div>
      <ul className="list">
        {(r.ingredients || []).map((i, idx) => <li key={idx}>{i}</li>)}
      </ul>
    </div>
    <div>
      <div className="subtitle">Шаги</div>
      <ol className="list list--ordered">
        {(r.steps || []).map((s, idx) => <li key={idx}>{s}</li>)}
      </ol>
    </div>
  </div>
)}



          <div className="stamp">{new Date(r.createdAt).toLocaleString()}</div>
        </div>
      </div>
    </section>
  )
}

// ----------------------
// Editor (создание/редактирование)
// ----------------------
function Editor({ initial, onSave, onCancel }: { initial?: Recipe; onSave: (r: Recipe) => void; onCancel: () => void }) {
  const [partsCount, setPartsCount] = useState<number>(initial?.parts?.length || 0)
const [parts, setParts] = useState<Part[]>(
  () => (initial?.parts && initial.parts.length)
    ? initial.parts
    : []
)
  const [title, setTitle] = useState(initial?.title || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [ingredients, setIngredients] = useState<string[]>(initial?.ingredients || [''])
  const [steps, setSteps] = useState<string[]>(initial?.steps || [''])
  const [cover, setCover] = useState<string>(initial?.cover || '')
  const [cats, setCats] = useState<string[]>(initial?.categories || [])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [done, setDone] = useState<boolean>(initial?.done ?? false)


  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const validate = () => {
    const e: Record<string, string> = {}
if (!title.trim()) e.title = 'Введите название'
if (partsCount > 0) {
  if (parts.some(p => p.ingredients.map(x => x.trim()).filter(Boolean).length === 0))
    e.ingredients = 'В каждом разделе должен быть хотя бы 1 ингредиент'
  if (parts.some(p => p.steps.map(x => x.trim()).filter(Boolean).length === 0))
    e.steps = 'В каждом разделе должен быть хотя бы 1 шаг'
} else {
  if (ingredients.map(x => x.trim()).filter(Boolean).length === 0) e.ingredients = 'Добавьте хотя бы 1 ингредиент'
  if (steps.map(x => x.trim()).filter(Boolean).length === 0) e.steps = 'Добавьте хотя бы 1 шаг'
}
setErrors(e)
return Object.keys(e).length === 0
  }



  const makePart = (idx: number): Part => ({
    id: crypto.randomUUID(),
    title: `Раздел ${idx + 1}`,
    ingredients: [''],
    steps: [''],
  })



  const ensurePartsCount = (nextCount: number) => {
    setParts(prev => {
      const arr = prev.slice(0, nextCount)
      while (arr.length < nextCount) arr.push(makePart(arr.length))
      return arr
    })
  }



  const toDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const onPickFile: React.ChangeEventHandler<HTMLInputElement> = async e => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) return alert('Пожалуйста, выберите изображение')
    const data = await toDataUrl(f)
    setCover(data)
  }

  const submit = () => {
    if (!validate()) return
    const rec: Recipe = {
      id: initial?.id || crypto.randomUUID(),
      title: title.trim(),
      description: description.trim(),
      cover: cover || undefined,
      createdAt: initial?.createdAt || Date.now(),
      favorite: initial?.favorite || false,
      categories: cats, done, 
      ...(partsCount > 0
        ? {
            parts: parts.map(p => ({
              ...p,
              title: p.title.trim(),
              ingredients: p.ingredients.map(x => x.trim()).filter(Boolean),
              steps: p.steps.map(x => x.trim()).filter(Boolean),
            })),
            ingredients: [], // оставим пустым для совместимости
            steps: [],
          }
        : {
            ingredients: ingredients.map(x => x.trim()).filter(Boolean),
            steps: steps.map(x => x.trim()).filter(Boolean),
            parts: [],
          }
      )
    }    
    onSave(rec)
  }

  const toggleCat = (c: string) => setCats(v => v.includes(c) ? v.filter(x => x !== c) : [...v, c])

  return (
    <section className="section">
      <div className="card">
        {cover && (
          <div className="card__media">
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <img src={cover} />
          </div>
        )}
        <div className="card__body form">
          <div className="grid2">
            <label className="field">
              <span className="label">Название</span>
              <input className={cls('control', errors.title && 'invalid')} value={title} onChange={e => setTitle(e.target.value)} placeholder="Напр.: Борщ по‑домашнему" />
              {errors.title && <span className="hint error">{errors.title}</span>}
            </label>

            <label className="field">
              <span className="label">Краткое описание (необязательно)</span>
              <textarea className="control" value={description} onChange={e => setDescription(e.target.value)} placeholder="Пара предложений о блюде..." />
            </label>
          </div>

          <div className="field">
            <span className="label">Категории</span>
            <div className="chips">
              {CATS.map(c => (
                <button type="button" key={c} className={cls('chip', cats.includes(c) && 'is-active')} onClick={() => toggleCat(c)}>{c}</button>
              ))}
            </div>
          </div>



          <div className="field">
  <span className="label">Статус</span>
  <label className="switch">
    <input
      type="checkbox"
      checked={done}
      onChange={e => setDone(e.target.checked)}
    />
    <span className="switch__track"><span className="switch__thumb" /></span>
    <span className="switch__text">{done ? 'Сделал' : 'Не сделал'}</span>
  </label>
</div>



          <div className="field">
  <span className="label">Разделы (0–3)</span>
  <select
    className="control"
    value={partsCount}
    onChange={e => {
      const next = Math.max(0, Math.min(3, Number(e.target.value) || 0))
      // если переходим с 0 к >0 — переносим текущие общие поля в первую часть
      if (partsCount === 0 && next > 0) {
        const first = makePart(0)
        first.title = ''
        first.ingredients = ingredients
        first.steps = steps
        setParts([first])
        setIngredients([''])
        setSteps([''])
      }
      setPartsCount(next)
      ensurePartsCount(next)
    }}
  >
    <option value={0}>Без разделений</option>
    <option value={1}>1 раздел</option>
    <option value={2}>2 раздела</option>
    <option value={3}>3 раздела</option>
  </select>
  <span className="hint small">Напр.: Бисквит, Конфи, Мусс</span>
</div>


          <div className="field">
            <span className="label">Обложка (фото блюда)</span>
            <div className="row gap">
              <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
                <ImageIcon className="icon" /> Загрузить фото
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
              {cover && <span className="hint">Изображение выбрано ✓</span>}
            </div>
          </div>

          {partsCount > 0 ? (
  <div className="vstack gap">
    {parts.map((p, i) => (
      <div key={p.id} className="card" style={{border:'1px solid var(--border)'}}>
        <div className="card__body">
          <label className="field">
            <span className="label">Название раздела #{i+1}</span>
            <input
              className="control"
              value={p.title}
              onChange={e => setParts(ps => ps.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x))}
              placeholder={`Напр.: Бисквит`}
            />
          </label>

          <FieldArray
            label="Ингредиенты"
            values={p.ingredients}
            setValues={(next) =>
              setParts(ps => ps.map((x, idx) =>
                idx === i ? { ...x, ingredients: typeof next === 'function' ? (next as any)(x.ingredients) : next } : x
              ))
            }
            placeholder="Напр.: 120 г муки"
          />

          <FieldArray
            label="Шаги"
            values={p.steps}
            setValues={(next) =>
              setParts(ps => ps.map((x, idx) =>
                idx === i ? { ...x, steps: typeof next === 'function' ? (next as any)(x.steps) : next } : x
              ))
            }
            placeholder="Напр.: Взбить яйца с сахаром"
            ordered
          />
        </div>
      </div>
    ))}
  </div>
) : (
  <>
    <FieldArray label="Ингредиенты" values={ingredients} setValues={setIngredients} placeholder="Напр.: 2 картофелины" />
    <FieldArray label="Шаги" values={steps} setValues={setSteps} placeholder="Напр.: Нарезать картофель кубиками" ordered />
  </>
)}


          <div className="row gap mt">
            <button onClick={submit} className="btn btn-primary grow">{initial ? 'Сохранить изменения' : 'Сохранить рецепт'}</button>
            <button onClick={onCancel} className="btn">Отмена</button>
          </div>
        </div>
      </div>
    </section>
  )
}

// утилита перестановки
function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr
  const a = arr.slice()
  const item = a.splice(from, 1)[0]
  a.splice(to, 0, item)
  return a
}

function FieldArray({ label, values, setValues, placeholder, ordered = false }: { label: string; values: string[]; setValues: React.Dispatch<React.SetStateAction<string[]>>; placeholder: string; ordered?: boolean }) {
  const move = (from: number, to: number) => setValues(v => arrayMove(v, from, to))

  return (
    <div className="field">
      <div className="row between">
        <span className="label">{label}</span>
        <button onClick={() => setValues(v => [...v, ''])} className="btn btn-ghost">Добавить</button>
      </div>
      <div className="vstack gap">
        {values.map((val, i) => (
          <div key={i} className="row gap item">
            <div className="bullet">{ordered ? i + 1 : '•'}</div>
            <input
              className="control grow"
              value={val}
              onChange={e => setValues(v => v.map((x, idx) => (idx === i ? e.target.value : x)))}
              placeholder={placeholder}
            />
            <div className="reorder">
              <button className="arrow" onClick={() => move(i, i - 1)} disabled={i === 0} title="Вверх">↑</button>
              <button className="arrow" onClick={() => move(i, i + 1)} disabled={i === values.length - 1} title="Вниз">↓</button>
            </div>
            <button onClick={() => setValues(v => v.filter((_, idx) => idx !== i))} className="iconbtn" title="Удалить">×</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ----------------------
// Profile Page
// ----------------------
function Profile({ recipes, globalSettings, isAdmin, onSettingsUpdate }: { 
  recipes: Recipe[]; 
  globalSettings: GlobalSettings;
  isAdmin: boolean;
  onSettingsUpdate: (settings: GlobalSettings) => void;
}) {
  const total = recipes.length
  const favs = recipes.filter(r => r.favorite).length
  const latest = recipes[0]?.title || '—'

  const toggleNotificationType = () => {
    const newType = globalSettings.notificationType === 'website' ? 'telegram' : 'website';
    onSettingsUpdate({
      ...globalSettings,
      notificationType: newType
    });
  };

  return (
    <section className="section">
      <div className="card">
        <div className="card__body">
          <div className="title">Мой профиль</div>
          <div className="muted">Ваши сохранённые рецепты хранятся локально на этом устройстве.</div>
          <div className="stats">
            <Stat label="Рецептов" value={total} />
            <Stat label="Избранное" value={favs} />
            <Stat label="Последний" value={latest} />
          </div>

          {/* Панель админа */}
          {isAdmin && (
            <div className="mt">
              <div className="subtitle">Админ-панель</div>
              <div className="vstack gap">
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={globalSettings.notificationType === 'telegram'}
                    onChange={toggleNotificationType}
                  />
                  <span className="switch__track"><span className="switch__thumb" /></span>
                  <span className="switch__text">
                    {globalSettings.notificationType === 'telegram' 
                      ? 'Заказы в Telegram' 
                      : 'Заказы на сайте'}
                  </span>
                </label>
                
                <div className="muted small">
                  {globalSettings.notificationType === 'telegram' 
                    ? '✅ Все заказы поступают в Telegram' 
                    : '🔔 Все заказы отображаются на сайте'}
                </div>
              </div>
            </div>
          )}

          {/* Обычным пользователям показываем текущий статус */}
          {!isAdmin && (
            <div className="mt">
              <div className="subtitle">Система заказов</div>
              <div className="muted">
                {globalSettings.notificationType === 'telegram' 
                  ? '✅ Ваши заказы отправляются администратору' 
                  : '🔔 Заказы отображаются на сайте'}
              </div>
            </div>
          )}

          <ExportImport recipes={recipes} />
        </div>
      </div>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <div className="stat__value">{String(value)}</div>
      <div className="stat__label">{label}</div>
    </div>
  )
}

function ExportImport({ recipes }: { recipes: Recipe[] }) {
  const fileInput = useRef<HTMLInputElement | null>(null)

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(recipes, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `recipepad-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importJson: React.ChangeEventHandler<HTMLInputElement> = e => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result))
        if (!Array.isArray(data)) throw new Error('bad format')
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
        location.reload()
      } catch {
        alert('Неверный файл экспорта')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="export">
      <div className="row between">
        <div>
          <div className="subtitle">Экспорт / Импорт</div>
          <div className="muted small">Сохраните резервную копию или перенесите рецепты на другое устройство.</div>
        </div>
        <div className="row gap">
          <button onClick={exportJson} className="btn btn-primary row gap">
            <BookmarkPlus className="icon" /> Экспорт
          </button>
          <button onClick={() => fileInput.current?.click()} className="btn">Импорт</button>
          <input ref={fileInput} type="file" accept="application/json" className="hidden" onChange={importJson} />
        </div>
      </div>
    </div>
  )
}

function ShoppingList({ recipes }: { recipes: Recipe[] }) {
  // по умолчанию выберем все рецепты
  const [selected, setSelected] = useState<string[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const toggle = (id: string) =>
    setSelected(v => (v.includes(id) ? v.filter(x => x !== id) : [...v, id]))
  const selectAll = () => setSelected(recipes.map(r => r.id))
  const selectNone = () => setSelected([])

  const picked = useMemo(() => recipes.filter(r => selected.includes(r.id)), [recipes, selected])
  const items = useMemo(
    () => mergeIngredients(picked.flatMap(r => allIngredients(r))),
    [picked]
  )

  const byTime = useMemo(() => [...recipes].sort((a,b)=>b.createdAt - a.createdAt), [recipes])
  const latest3 = byTime.slice(0, 3)

  const [done, setDone] = useState<Set<number>>(new Set())
  const toggleDone = (i: number) =>
    setDone(s => {
      const next = new Set(s)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })

  const copyText = async () => {
    const text =
      `Список покупок (${picked.length} рецепта):\n` +
      items.map(formatItem).map(t => `• ${t}`).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      alert('Скопировано в буфер обмена ✅')
    } catch {
      alert('Не удалось скопировать :(')
    }
  }
  return (
    <>
      <section className="section">
        <div className="toolbar" style={{flexWrap:'wrap', gap:8}}>
          <div className="chips">
            {latest3.map(r => (
              <button
                key={r.id}
                className={`chip ${selected.includes(r.id) ? 'is-active' : ''}`}
                onClick={() => toggle(r.id)}
                title={r.title}
              >
                {r.title}
              </button>
            ))}
            {recipes.length > 3 && (
              <button className="chip" onClick={() => setPickerOpen(true)}>
                Показать все ({recipes.length})
              </button>
            )}
          </div>
          <div className="row gap" style={{marginLeft:'auto'}}>
            <button className="btn btn-ghost" onClick={selectNone}>Снять всё</button>
            <button className="btn btn-ghost" onClick={selectAll}>Выбрать всё</button>
            <button className="btn btn-primary" onClick={copyText}>Скопировать</button>
          </div>
        </div>
  
        <div className="card">
          <div className="card__body">
            <div className="subtitle">Список покупок — {items.length} поз.</div>
            <ul className="checklist">
              {items.map((it, i) => (
                <li key={it.key + i} className={done.has(i) ? 'is-done' : ''}>
                  <label className="row gap">
                    <input type="checkbox" checked={done.has(i)} onChange={() => toggleDone(i)} />
                    <span>{formatItem(it)}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
  
      {pickerOpen && (
        <div
          className="modal"
          onClick={(e) => { if (e.target === e.currentTarget) setPickerOpen(false) }}
        >
          <div className="modal__panel">
            <div className="row between">
              <div className="subtitle">Выберите рецепты</div>
              <button className="iconbtn" onClick={() => setPickerOpen(false)}>×</button>
            </div>
  
            <div className="modal__list">
              {byTime.map(r => (
                <label key={r.id} className="selector__item">
                  <input
                    type="checkbox"
                    checked={selected.includes(r.id)}
                    onChange={() => toggle(r.id)}
                  />
                  <span className="selector__title">{r.title}</span>
                  {r.categories?.length ? (
                    <span className="selector__cats">{r.categories.join(', ')}</span>
                  ) : null}
                </label>
              ))}
            </div>
  
            <div className="row gap mt">
              <button className="btn btn-ghost" onClick={selectNone}>Снять всё</button>
              <button className="btn btn-ghost" onClick={selectAll}>Выбрать всё</button>
              <div className="grow" />
              <button className="btn btn-primary" onClick={() => setPickerOpen(false)}>Готово</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

