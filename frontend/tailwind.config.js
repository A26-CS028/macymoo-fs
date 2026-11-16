/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Warna dan font dari Figma macyourmoo
      colors: {
        kuning: { DEFAULT: '#f9b822', tua: '#c98a0b' },
        ungu: { DEFAULT: '#4d00c9', tua: '#33008a', gelap: '#1e054d' },
        krem: { DEFAULT: '#faf6ee', field: '#f5f2eb' },
        abu: { DEFAULT: '#6e6787', muda: '#9a91b2', tua: '#776e8f', label: '#cbc1e8' },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        lilita: ['"Lilita One"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        // Teks putar di hero: 5 baris + baris pertama diulang supaya putarannya mulus
        'teks-putar': {
          '0%, 16%': { transform: 'translateY(0)' },
          '20%, 36%': { transform: 'translateY(-24px)' },
          '40%, 56%': { transform: 'translateY(-48px)' },
          '60%, 76%': { transform: 'translateY(-72px)' },
          '80%, 96%': { transform: 'translateY(-96px)' },
          '100%': { transform: 'translateY(-120px)' },
        },
        muncul: { from: { opacity: '0' }, to: { opacity: '1' } },
        // Pita ulasan: daftar diulang dua kali, geser setengah lebar lalu mulai lagi
        ulasan: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        // Figma "Sorotan Menu" Gerak 1-3: foto samping naik-turun, foto utama membesar-mengecil
        melayang: { '0%, 100%': { transform: 'translateY(0)' }, '33%': { transform: 'translateY(6px)' }, '66%': { transform: 'translateY(2px)' } },
        bernapas: { '0%, 100%': { transform: 'scale(1)' }, '33%': { transform: 'scale(0.97)' }, '66%': { transform: 'scale(1.017)' } },
      },
      animation: {
        'teks-putar': 'teks-putar 12s ease-in-out infinite',
        muncul: 'muncul 500ms ease-out',
        ulasan: 'ulasan 30s linear infinite',
        melayang: 'melayang 3.5s ease-in-out infinite',
        bernapas: 'bernapas 3.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
