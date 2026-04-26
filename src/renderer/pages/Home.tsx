import { useUIStore } from '../store/uiStore'
import logoPng from '../../assets/Logo.png'

const COL_1 = [
  'https://images.unsplash.com/photo-1730956473717-b1bb69fc595e?q=80&w=707&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1548811579-017cf2a4268b?q=80&w=689&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1753093329977-d950f394b215?q=80&w=764&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
]

const COL_2 = [
  'https://images.unsplash.com/photo-1608146226687-b39d090a8c20?q=80&w=688&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1696671294244-558d2365683d?q=80&w=764&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1702700484900-14d8d528b660?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
]



function MarqueeColumn({ images, direction }: { images: string[]; direction: 'up' | 'down' }) {
  // Duplicate array carefully to ensure seamless loop
  const seamlessImages = [...images, ...images]
  
  return (
    <div className="flex-1 overflow-hidden relative bg-black">
      <div className={`flex flex-col gap-2 w-full ${direction === 'up' ? 'animate-scroll-up' : 'animate-scroll-down'}`}>
        {seamlessImages.map((src, i) => (
          <img 
            key={i} 
            src={src} 
            alt="Editorial" 
            className="w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity grayscale-[30%] hover:grayscale-0 duration-500"
          />
        ))}
      </div>
    </div>
  )
}


export default function Home() {
  const { setActiveTab } = useUIStore()

  const handleOpenImage = async () => {
    const result = await window.frame.file.openForEditor()
    if (result.kind === 'empty') return
    if (result.kind === 'project') {
      void window.frame.window.openEditor({
        project: { filePath: result.filePath, project: result.project },
      })
      return
    }
    void window.frame.window.openEditor({ files: result.files })
  }

  return (
    <div className="flex w-full h-full bg-[#f4f4f4] text-black overflow-hidden font-mono">
      
      {/* ─── LEFT PANE (55%) ─── */}
      <div className="w-[65%] h-full flex flex-col p-10 justify-between shrink-0">
        
        {/* Top Navbar */}
        <div className="flex justify-between items-center text-[10px] tracking-[0.15em] font-semibold uppercase">
          <button className="flex items-center gap-2 hover:opacity-60 transition-opacity">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
              <rect x="3" y="3" width="18" height="18" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
            <span>RHISHAV</span>
          </button>

          <div className="flex gap-6">
            <button className="hover:opacity-60 transition-opacity">RECENTS +</button>
            <button className="hover:opacity-60 transition-opacity">COMMUNITY +</button>
            <button className="hover:opacity-60 transition-opacity">CREATE +</button>
          </div>
        </div>

        {/* Center Canvas */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <img
            src={logoPng}
            alt=""
            className="h-20 w-20 md:h-24 md:w-24 object-contain mb-6 select-none pointer-events-none"
            aria-hidden
          />
          <div className="relative inline-flex items-start">
            <h1 className="font-kenoky text-[clamp(5rem,14vw,16rem)] leading-[0.9] tracking-[-0.02em] text-black">
              frescava
            </h1>
            <span className="text-xl md:text-3xl font-sans font-bold absolute -right-6 md:-right-10 top-2 md:top-6 opacity-80">
              ®
            </span>
          </div>

          {/* Sub Navigation Links */}
          <div className="mt-12 flex gap-8 text-[11px] font-semibold tracking-[0.2em] uppercase text-black/40">
            <button onClick={handleOpenImage} className="hover:text-black transition-colors hover:scale-105 transform duration-300">OPEN</button>
            <button
              type="button"
              onClick={() => void window.frame.window.openEditor()}
              className="hover:text-black transition-colors hover:scale-105 transform duration-300"
            >
              EDITOR
            </button>
            <button onClick={() => setActiveTab('canvas')} className="hover:text-black transition-colors hover:scale-105 transform duration-300">CANVAS</button>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="flex justify-between items-end text-[9px] font-semibold tracking-widest uppercase">
          <button onClick={handleOpenImage} className="text-left w-32 hover:opacity-60 transition-opacity">
            WHAT'S NEW ?
          </button>
          
          <div className="text-center tracking-[0.1em] leading-relaxed mx-4">
            THE ART OF HARMONY, CLOSER TO<br />
            THE EYES OF THE BEHOLDER
          </div>

          <div className="text-right w-32">
            FRESCAVA 2026
          </div>
        </div>
      </div>

      {/* ─── RIGHT PANE (45%) ─── */}
      <div className="w-[35%] h-full bg-black p-2 flex gap-2 flex-grow">
        <MarqueeColumn direction="up" images={COL_1} />
        <MarqueeColumn direction="down" images={COL_2} />
        {/* <MarqueeColumn direction="up" images={COL_3} /> */}
      </div>

    </div>
  )
}
