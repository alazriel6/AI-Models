import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import './App.css'
import ModelList from './components/model-list.tsx'

// Komponen Halaman Lain (Opsional)
function Home() {
  return <h2>Selamat Datang di Models Guide</h2>
}

function About() {
  return <h2>Tentang Kami</h2>
}

function Contact() {
  return <h2>Hubungi Kami</h2>
}

function App() {
  return (
    <BrowserRouter>
      <div className="main-app">
        <nav>
          <h1>Models Guide</h1>
          <ul>
            <li>
              {/* Gunakan Link dari react-router-dom agar halaman tidak di-reload */}
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/models">All Models</Link>
            </li>
            <li>
              <Link to="/about">About</Link>
            </li>
            <li>
              <Link to="/contact">Contact</Link>
            </li>
          </ul>
        </nav>

        {/* Konten akan berganti sesuai URL/Path */}
        <main className="content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/models" element={<ModelList />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App