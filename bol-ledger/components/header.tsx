"use client"

import Image from 'next/image'
import { ArrowLeft, Plane, Ship, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useApp } from '@/lib/app-context'

interface HeaderProps {
  showBack?: boolean
  title?: string
  subtitle?: string
}

export function Header({ showBack = false, title, subtitle }: HeaderProps) {
  const { goBack, currentAccount, currentCompany, view } = useApp()

  const getTitle = () => {
    if (title) return title
    if (view === 'ledger' && currentCompany) return currentCompany.name
    if (view === 'invoice' && currentCompany) return `${currentCompany.name} - Invoice`
    if (view === 'companies' && currentAccount) return currentAccount.name
    return 'SKY ARIANA & BALAM BAR BARAN'
  }

  const getSubtitle = () => {
    if (subtitle) return subtitle
    if (view === 'ledger') return 'Company Ledger'
    if (view === 'invoice') return 'Create Invoice'
    if (view === 'companies') return 'Account Companies'
    return 'International Freight & Logistics'
  }

  return (
    <header className="glass-strong sticky top-0 z-50 border-b border-white/20 no-print">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-4">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={goBack}
              className="shrink-0 hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="flex items-center gap-4 flex-1">
            <div className="relative h-14 w-20 shrink-0">
              <Image
                src="/logo.png"
                alt="SKY ARIANA & BALAM BAR BARAN Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg md:text-xl font-bold text-foreground truncate">
                {getTitle()}
              </h1>
              <p className="text-sm text-muted-foreground truncate">
                {getSubtitle()}
              </p>
            </div>
          </div>
          
          {/* Transport icons */}
          <div className="hidden md:flex items-center gap-3 text-primary/50">
            <Plane className="h-5 w-5" />
            <Ship className="h-5 w-5" />
            <Truck className="h-5 w-5" />
          </div>
        </div>
      </div>
    </header>
  )
}
