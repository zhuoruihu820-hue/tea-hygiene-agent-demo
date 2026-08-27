import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title:'净巡 · 茶饮卫生巡检',description:'面向茶饮门店的规则驱动卫生巡检 Agent。' };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="zh-CN"><body>{children}</body></html>;}
