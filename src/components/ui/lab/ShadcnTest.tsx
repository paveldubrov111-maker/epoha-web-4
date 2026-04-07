import React from "react"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Zap, Rocket, ShieldCheck } from "lucide-react"
import { motion } from "motion/react"

export function ShadcnTest() {
  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <div className="space-y-2 text-center">
        <h2 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/50">
          Shadcn/UI + 5 Premium Themes
        </h2>
        <p className="text-muted-foreground text-lg">
          Всі компоненти нижче автоматично змінюють свій "ДНК" при виборі нової теми.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="glass-card shadow-xl border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Колірна гармонія
            </CardTitle>
            <CardDescription>Primary: {`hsl(var(--primary))`}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm opacity-80 italic">
              Ця картка автоматично підлаштовується під обрану колірну схему: від благородного золота до неонового кіберпанку.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="default" className="w-full shadow-lg">Головна дія</Button>
          </CardFooter>
        </Card>

        <Card className="glass-card shadow-xl border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Інтеграція
            </CardTitle>
            <CardDescription>Tailwind v4 Architecture</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <Button variant="secondary">Вторинна кнопка</Button>
              <Button variant="outline">Контурна кнопка</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card shadow-xl border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-primary" />
              Магія анімацій
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: "75%" }}
                 transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
                 className="h-full bg-primary"
               />
            </div>
            <p className="text-xs text-muted-foreground text-center">Прогрес-бари та завантаження також синхронізовані.</p>
          </CardContent>
          <CardFooter>
            <Button variant="ghost" className="w-full">Прихована дія</Button>
          </CardFooter>
        </Card>
      </div>

      <div className="flex flex-wrap gap-4 justify-center p-6 bg-background/20 backdrop-blur-md rounded-2xl border border-primary/10">
        <Button size="lg" className="rounded-full px-8">Почати навчання</Button>
        <Button variant="destructive" size="sm">Скинути прогрес</Button>
        <Button variant="link">Всі модулі</Button>
      </div>
    </div>
  )
}
