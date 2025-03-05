import { useState, useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { motion } from 'framer-motion'
import Background from './components/Background'

function App() {
  const [content, setContent] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [content])

  return (
    <div className="relative w-full h-screen bg-background overflow-hidden">
      <div className="absolute inset-0">
        <Canvas camera={{ position: [0, 0, 1] }}>
          <Background />
        </Canvas>
      </div>

      <div className="relative z-10 w-full h-full flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-4xl"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mb-8 text-center"
          >
            <h1 className="font-serif text-4xl font-semibold text-primary">
              Manifesto
            </h1>
            <p className="mt-2 text-sm text-secondary font-sans">
              Write your thoughts in this ethereal space
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-xl"
          >
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing..."
              className="w-full min-h-[300px] bg-transparent border-none outline-none resize-none font-serif text-lg text-primary placeholder-secondary/50 overflow-hidden"
              style={{
                caretColor: '#C599B6',
              }}
            />
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

export default App
