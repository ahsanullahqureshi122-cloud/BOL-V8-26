import Image from "next/image"

export function BillOfLadingHeader() {
  return (
    <header className="w-full border-b-2 border-primary pb-6 mb-6">
      <div className="flex flex-col items-center gap-4">
        {/* Responsive Logo */}
        <div className="relative w-32 h-24 sm:w-40 sm:h-28 md:w-48 md:h-32 lg:w-56 lg:h-36">
          <Image
            src="/images/logo.png"
            alt="Sky Ariana & Balam Bar Baran - International Transport & Logistics"
            fill
            className="object-contain"
            priority
          />
        </div>

        {/* Company Name */}
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary tracking-wide">
            SKY ARIANA & BALAM BAR BARAN
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground mt-1">
            International Transport & Logistics
          </p>
        </div>

        {/* Document Title - Bilingual */}
        <div className="mt-4 text-center">
          <h2 className="text-2xl sm:text-2xl md:text-4xl font-bold text-primary">
            SKY-BALAM BILL OF LADING
          </h2>
          <p className="text-xl sm:text-2xl md:text-3xl font-semibold text-primary mt-1" dir="rtl">
            بارنامه حمل و نقل بین‌المللی
          </p>
        </div>
      </div>
    </header>
  )
}
