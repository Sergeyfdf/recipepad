import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, PlusCircle, User, Search, Image as ImageIcon, Trash2, BookmarkPlus } from 'lucide-react'
import './App.css'

// ----------------------
// Helpers & Storage
// ----------------------
const STORAGE_KEY = 'recipepad.v1.recipes'
const THEME_KEY = 'recipepad.theme'

type Recipe = {
  id: string
  title: string
  description?: string
  ingredients: string[]
  steps: string[]
  cover?: string
  createdAt: number
  favorite?: boolean
}

function loadRecipes(): Recipe[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveRecipes(recs: Recipe[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recs))
}

function cls(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export default function App() {
  const [tab, setTab] = useState<'feed' | 'add' | 'profile'>('feed')
  const [recipes, setRecipes] = useState<Recipe[]>(loadRecipes())
  const getSystemTheme = () => (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light'
  const [theme, setTheme] = useState<string>(() => localStorage.getItem(THEME_KEY) || getSystemTheme())

  useEffect(() => saveRecipes(recipes), [recipes])
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  const onAdd = (r: Recipe) => setRecipes((prev: Recipe[]) => [r, ...prev])
  const onDelete = (id: string) => setRecipes((prev: Recipe[]) => prev.filter(r => r.id !== id))
  const onToggleFav = (id: string) => setRecipes((prev: Recipe[]) => prev.map(r => (r.id === id ? { ...r, favorite: !r.favorite } : r)))

  return (
    <div className="app">
      <Header theme={theme} setTheme={setTheme} onGoAdd={() => setTab('add')} />

      <main className="container main">
        <AnimatePresence mode="wait">
          {tab === 'feed' && (
            <motion.div key="feed" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <Feed recipes={recipes} onDelete={onDelete} onToggleFav={onToggleFav} />
            </motion.div>
          )}
          {tab === 'add' && (
            <motion.div key="add" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <AddRecipe onAdd={onAdd} onDone={() => setTab('feed')} />
            </motion.div>
          )}
          {tab === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <Profile recipes={recipes} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <TabBar tab={tab} setTab={setTab} />
    </div>
  )
}

// ----------------------
// Header
// ----------------------
function Header({ theme, setTheme, onGoAdd }: { theme: string; setTheme: (v: string) => void; onGoAdd: () => void }) {
  return (
    <header className="header">
      <div className="container header__inner">
        <div className="brand">RecipePad</div>
        <div className="header__actions">
          <button className="btn btn-ghost" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button className="btn btn-primary hide-sm" onClick={onGoAdd}>
            <PlusCircle className="icon" /> Добавить
          </button>
        </div>
      </div>
    </header>
  )
}

// ----------------------
// Bottom Tab Bar
// ----------------------
function TabBar({ tab, setTab }: { tab: 'feed' | 'add' | 'profile'; setTab: (t: 'feed' | 'add' | 'profile') => void }) {
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
function Feed({ recipes, onDelete, onToggleFav }: { recipes: Recipe[]; onDelete: (id: string) => void; onToggleFav: (id: string) => void }) {
  const [q, setQ] = useState('')
  const [onlyFav, setOnlyFav] = useState(false)

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    const base = onlyFav ? recipes.filter(r => r.favorite) : recipes
    if (!qq) return base
    return base.filter(r => r.title.toLowerCase().includes(qq) || r.ingredients.some(i => i.toLowerCase().includes(qq)))
  }, [recipes, q, onlyFav])

  return (
    <section className="section">
      <div className="toolbar">
        <div className="input input--withicon">
          <Search className="icon input__icon" />
          <input className="input__control" placeholder="Поиск по названию или ингредиентам…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <button onClick={() => setOnlyFav((v: boolean) => !v)} className={cls('btn', onlyFav ? 'btn-amber' : 'btn-ghost')} title="Показать только избранное">
          ★
        </button>
      </div>

      {filtered.length === 0 && <div className="empty">Ничего не найдено. Добавьте рецепт или измените запрос.</div>}

      <div className="cards">
        <AnimatePresence>
          {filtered.map(r => (
            <RecipeCard key={r.id} r={r} onDelete={onDelete} onToggleFav={onToggleFav} />
          ))}
        </AnimatePresence>
      </div>
    </section>
  )
}

// helper: собрать 4 строки-превью (сначала ингредиенты, потом шаги)
function makePreviewLines(r: Recipe, max = 4): string[] {
  const out: string[] = []
  for (const i of r.ingredients) {
    if (out.length >= max) break
    out.push(`• ${i}`)
  }
  let n = 1
  for (const s of r.steps) {
    if (out.length >= max) break
    out.push(`${n++}. ${s}`)
  }
  return out
}

function RecipeCard({ r, onDelete, onToggleFav }: { r: Recipe; onDelete: (id: string) => void; onToggleFav: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const preview = makePreviewLines(r)
  const truncated = r.ingredients.length + r.steps.length > preview.length

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

        {!expanded ? (
          <div>
            <ul className="preview-lines">
              {preview.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
              {truncated && <li className="ellipsis">…</li>}
            </ul>
            {truncated && (
              <div className="row mt">
                <button className="btn btn-ghost" onClick={() => setExpanded(true)}>Подробнее</button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="grid2">
              <div>
                <div className="subtitle">Ингредиенты</div>
                <ul className="list">
                  {r.ingredients.map((i, idx) => (
                    <li key={idx}>{i}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="subtitle">Шаги</div>
                <ol className="list list--ordered">
                  {r.steps.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ol>
              </div>
            </div>
            <div className="row mt">
              <button className="btn btn-ghost" onClick={() => setExpanded(false)}>Скрыть</button>
            </div>
          </>
        )}

        <div className="stamp">{new Date(r.createdAt).toLocaleString()}</div>
      </div>
    </motion.article>
  )
}

// ----------------------
// Add Recipe Page
// ----------------------
function AddRecipe({ onAdd, onDone }: { onAdd: (r: Recipe) => void; onDone: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [ingredients, setIngredients] = useState<string[]>([''])
  const [steps, setSteps] = useState<string[]>([''])
  const [cover, setCover] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const validate = () => {
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = 'Введите название'
    if (ingredients.filter(x => x.trim()).length === 0) e.ingredients = 'Добавьте хотя бы 1 ингредиент'
    if (steps.filter(x => x.trim()).length === 0) e.steps = 'Добавьте хотя бы 1 шаг'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const toDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
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
      id: crypto.randomUUID(),
      title: title.trim(),
      description: description.trim(),
      ingredients: ingredients.map(x => x.trim()).filter(Boolean),
      steps: steps.map(x => x.trim()).filter(Boolean),
      cover: cover || undefined,
      createdAt: Date.now()
    }
    onAdd(rec)
    onDone()
  }

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
            <span className="label">Обложка (фото блюда)</span>
            <div className="row gap">
              <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
                <ImageIcon className="icon" /> Загрузить фото
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
              {cover && <span className="hint">Изображение выбрано ✓</span>}
            </div>
          </div>

          <FieldArray label="Ингредиенты" values={ingredients} setValues={setIngredients} placeholder="Напр.: 2 картофелины" />
          <FieldArray label="Шаги" values={steps} setValues={setSteps} placeholder="Напр.: Нарезать картофель кубиками" ordered />

          <div className="row gap mt">
            <button onClick={submit} className="btn btn-primary grow">Сохранить рецепт</button>
            <button onClick={onDone} className="btn">Отмена</button>
          </div>
        </div>
      </div>
    </section>
  )
}

// вспомогательнаая функция перестановки
function arrayMove<T>(arr: T[], from: number, to: number): T[] {
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
function Profile({ recipes }: { recipes: Recipe[] }) {
  const total = recipes.length
  const favs = recipes.filter(r => r.favorite).length
  const latest = recipes[0]?.title || '—'

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