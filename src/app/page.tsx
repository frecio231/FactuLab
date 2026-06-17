import InventoryForm from '@/components/FactuLab/InventoryForm';
import { Toaster } from '@/components/ui/toaster';

export default function Home() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center py-12 px-4">
      {/* Background patterns */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
      </div>

      <InventoryForm />
      
      <footer className="mt-12 text-muted-foreground text-sm flex flex-col items-center space-y-2">
        <p>© 2024 FactuLab Clinique - Soluciones de Precisión</p>
        <div className="flex space-x-4">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            Operación Local Offline
          </span>
          <span className="opacity-50">|</span>
          <span>100% Privado y Seguro</span>
        </div>
      </footer>

      <Toaster />
    </main>
  );
}
