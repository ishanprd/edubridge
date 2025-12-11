import Sidebar from "./Sidebar"

export default function AdminLayout({ children }) {
    return (
        <div className="min-h-screen">
            <Sidebar />
            <main className="md:pl-64 pt-[63px] md:pt-0">
                {children}
            </main>
        </div>
    )
}