"use client"

import { useState } from "react"
import type { CSSProperties, ReactNode, ComponentType } from "react"
import type { BillOfLadingFormData } from "@/lib/types/bill-of-lading"
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  FileText,
  Mail,
  MapPin,
  Package,
  Phone,
  Route,
  ShieldCheck,
  Truck,
  UserRound,
} from "lucide-react"
import {
  RouteAirIcon,
  RouteCarIcon,
  RouteTrainIcon,
  RouteTruckIcon,
  RouteVesselIcon,
} from "../icons/RouteTransportIcons"

interface A4PreviewProps {
  bolNumber: string
  issueDate: string
  persianDate: string
  persianDateNumeric: string
  formData: BillOfLadingFormData
  logoUrl?: string
  companyName?: string
  companyNamePersian?: string
  companySubtitle?: string
  companyPhone?: string
  companyEmail?: string
  companyAddress?: string
  companyLicence?: string
  exportTarget?: boolean
  pdfExport?: boolean
  includeColorStrip?: boolean
}

type DetailItem = {
  label: string
  value?: string | null
  important?: boolean
  rtl?: boolean
  highlight?: boolean
  highlightColor?: string
}

export const sampleBillOfLadingData: Partial<BillOfLadingFormData> = {
  bol_number: "BOL-2026-NSA001",
  notes_1_label: "Loading Contact",
  notes_1: "Nazar Mohammad (Yarmal)\n(+93) 0 700 203 307",
  notes_2_label: "Representative",
  notes_2: "Abdul Wahab Regwal / Najibullah Hussain Mahmoodi Muqadam\n0796140001  0703130001\nDougharoun Representative: 09152091993",
  shipper_name: "PAHLAWAN NOORI LTD",
  shipper_address: "Shorandam Industrial Park, Kandahar, Afghanistan",
  consignee_name: "S V INTERNATIONAL",
  consignee_address: "Delhi, India",
  routes: [
    { id: "sample-route-1", location: "Kandahar", locationPersian: "کندهار", stopOrder: 1, stopLabel: "Origin", transportMode: "truck" },
    { id: "sample-route-2", location: "Nimroz", locationPersian: "نیمروز", stopOrder: 2, stopLabel: "Stop 1", transportMode: "truck" },
    { id: "sample-route-3", location: "Bandar Abbas, IR", locationPersian: "بندرعباس، ایران", stopOrder: 3, stopLabel: "Stop 2", transportMode: "vessel" },
    { id: "sample-route-4", location: "Dubai, AE", locationPersian: "دبی، امارات", stopOrder: 4, stopLabel: "Stop 3", transportMode: "vessel" },
    { id: "sample-route-5", location: "Nhava Sheva, IN", locationPersian: "نهاوا شوا، هند", stopOrder: 5, stopLabel: "Destination", transportMode: "vessel" },
  ],
  cargo_description: `📦 CONTAINER & CARGO DETAILS │ 🧾 DOCUMENT & SHIPPING DETAILS
🥬 Cargo: | 📅 Transit Date: | 📄 HS CODE:  │ 📄 Afghan TC No:  │ 📄 Invoice NO: `,
  net_weight: "49,320 KGS",
  gross_weight: "55,685 KGS",
  number_of_packages: "1407 CNTS",
}

const a4ShellStyle = {
  background: "linear-gradient(135deg, #eff6ff 0%, #ffffff 48%, #ecfeff 100%)",
  fontFamily: "Arial, Helvetica, Inter, Calibri, sans-serif",
} satisfies CSSProperties

const blueBarStyle = {
  background: "linear-gradient(90deg, #1d4ed8 0%, #2563eb 58%, #0891b2 100%)",
} satisfies CSSProperties

const darkHeaderStyle = {
  background: "linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)",
} satisfies CSSProperties

const headerGridStyle = {
  display: "grid",
  gridTemplateColumns: "30mm 1fr 40mm",
  alignItems: "center",
  columnGap: "4mm",
} satisfies CSSProperties

const logoFrameStyle = {
  alignItems: "center",
  display: "flex",
  height: "30mm",
  justifyContent: "center",
  maxHeight: "30mm",
  maxWidth: "45mm",
  minHeight: "30mm",
  overflow: "hidden",
  width: "45mm",
} satisfies CSSProperties

const logoImageStyle = {
  display: "block",
  height: "auto",
  maxHeight: "26mm",
  maxWidth: "42mm",
  objectFit: "contain",
  width: "auto",
} satisfies CSSProperties

const labels = {
  persianCompanyFallback: "\u0634\u0631\u06a9\u062a \u062d\u0645\u0644 \u0648 \u0646\u0642\u0644 \u0628\u06cc\u0646 \u0627\u0644\u0645\u0644\u0644\u06cc",
  billOfLadingFa: "\u0628\u0627\u0631\u0646\u0627\u0645\u0647",
  exporterContactsFa: "\u062a\u0645\u0627\u0633\u200c\u0647\u0627\u06cc \u0635\u0627\u062f\u0631\u06a9\u0646\u0646\u062f\u0647",
  exporterInfoFa: "\u0641\u0631\u0633\u062a\u0646\u062f\u0647",
  consigneeInfoFa: "\u06af\u06cc\u0631\u0646\u062f\u0647",
  notifyPartyFa: "\u0637\u0631\u0641 \u0627\u0637\u0644\u0627\u0639\u002d\u0631\u0633\u0627\u0646\u06cc",
  routeFa: "\u0645\u0633\u06cc\u0631 \u062d\u0645\u0644 \u0648 \u0646\u0642\u0644",
  shipmentInfoFa: "\u0627\u0637\u0644\u0627\u0639\u0627\u062a \u062d\u0645\u0644",
  cargoDescFa: "\u0634\u0631\u062d \u06a9\u0627\u0644\u0627",
  containerNoFa: "\u0634\u0645\u0627\u0631\u0647 \u06a9\u0627\u0646\u062a\u06cc\u0646\u0631",
  sealNoFa: "\u0634\u0645\u0627\u0631\u0647 \u067e\u0644\u0645\u0628",
  packagesFa: "\u062a\u0639\u062f\u0627\u062f \u0628\u0633\u062a\u0647",
  kgsPerCartonFa: "\u06a9\u06cc\u0644\u0648 \u0641\u06cc \u06a9\u0627\u0631\u062a\u0646",
  grossPerCartonFa: "\u0648\u0632\u0646 \u0646\u0627\u062e\u0627\u0644\u0635 \u0641\u06cc \u06a9\u0627\u0631\u062a\u0646",
  rateFa: "\u0646\u0631\u062e \u0641\u06cc \u06a9\u06cc\u0644\u0648",
  goodsValueFa: "\u0627\u0631\u0632\u0634 \u06a9\u0627\u0644\u0627",
  netWeightFa: "\u0648\u0632\u0646 \u062e\u0627\u0644\u0635",
  grossWeightFa: "\u0648\u0632\u0646 \u0646\u0627\u062e\u0627\u0644\u0635",
  measurementFa: "\u0627\u0646\u062f\u0627\u0632\u0647",
  goodsDescriptionFa: "\u0634\u0631\u062d \u06a9\u0627\u0644\u0627",
  stampFa: "\u0645\u0647\u0631",
  companyStampSignFa: "\u0645\u0647\u0631 \u0648 \u0627\u0645\u0636\u0627\u06cc \u0634\u0631\u06a9\u062a",
  authorityVerificationFa: "\u062a\u0627\u06cc\u06cc\u062f \u0631\u0633\u0645\u06cc",
} as const

function cleanText(value?: string | null) {
  if (!value) return ""
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function hasValue(value?: string | null) {
  return cleanText(value).length > 0
}

function joinOfficeLine(parts: Array<string | undefined>) {
  return parts.map(cleanText).filter(Boolean).join(" | ")
}

function containsLatin(value: string) {
  return /[A-Za-z]/.test(value)
}

function containsArabic(value: string) {
  return /[\u0600-\u06FF]/.test(value)
}

function textDirection(value: string) {
  const text = cleanText(value)
  const hasArabic = /[\u0600-\u06FF]/.test(text)
  const hasLatin = /[A-Za-z]/.test(text)
  return hasArabic && !hasLatin ? "rtl" : "ltr"
}

function hasRTLText(value?: string | null) {
  const text = cleanText(value)
  return /[\u0600-\u06FF]/.test(text) && !/[A-Za-z]/.test(text)
}

function TextLines({
  value,
  className,
}: {
  value?: string | null
  className?: string
}) {
  const lines = cleanText(value).split("\n").filter(Boolean)

  if (lines.length === 0) return null

  return (
    <span
      className={`block min-w-0 max-w-full ${className || ""}`}
      style={{
        overflowWrap: "anywhere",
        unicodeBidi: "plaintext",
        textAlign: "inherit",
        wordBreak: "break-word",
      }}
    >
      {lines.map((line, index) => {
        const lineDir = textDirection(line)
        // Detect if line is composed only of Persian digits and date separators like / or -
        const isPersianDigitsOnly = /^[\u06F0-\u06F9\/\-\s:]+$/.test(line.trim())
        const isPersianLine = lineDir === "rtl" || /[\u0600-\u06FF]/.test(line)
        const renderDir = isPersianDigitsOnly ? "ltr" : lineDir

        return (
          <span
            key={`${line}-${index}`}
            className={`block ${isPersianLine ? "persian-text bol-persian-text font-[vazirmatn]" : ""} ${isPersianDigitsOnly ? "persian-digits" : ""}`}
            dir={renderDir}
          >
            {line}
          </span>
        )
      })}
    </span>
  )
}

function Section({
  title,
  subtitle,
  icon,
  children,
  glass = false,
  printKey,
  pdfMode = false,
  titleClassName,
}: {
  title: string
  subtitle?: string
  icon: ReactNode
  children: ReactNode
  glass?: boolean
  printKey?: string
  pdfMode?: boolean
  titleClassName?: string
}) {
  return (
    <section
      dir="ltr"
      data-print-section={printKey || title}
      {...(pdfMode ? { 'data-no-break': true } : {})}
      className={`overflow-hidden rounded-xl border ${pdfMode ? '' : 'shadow-md shadow-blue-100/70'} ${
        glass ? "border-white/80 bg-white/60 backdrop-blur-lg" : "border-blue-100 bg-white"
      }`}
    >
      <div className="flex items-center justify-between px-2.5 py-1.5 text-white" style={blueBarStyle}>
          <div className="flex items-center gap-2">
          {icon}
          {/* Force English title to render left-to-right so mixed-language headers don't flip */}
          <h3 dir="ltr" className={`${titleClassName || 'text-[10.5pt]'} font-black uppercase leading-none tracking-wide`}>
            {title}
          </h3>
        </div>
        {subtitle && (
          <p className="persian-text bol-persian-text font-[vazirmatn] text-[10.5pt] font-bold leading-none" dir="rtl">
            {subtitle}
          </p>
        )}
      </div>
      <div className="p-2">{children}</div>
    </section>
  )
}

function DetailCard({
  label,
  value,
  important,
  rtl,
  glass = false,
  pdfMode = false,
  compact = false,
  highlight = false,
  highlightColor,
  className,
}: DetailItem & { glass?: boolean; pdfMode?: boolean; compact?: boolean; className?: string }) {
  if (!hasValue(value)) return null
  const labelDirection = textDirection(label)
  const valueDirection = textDirection(value || "")
  const rightAligned = rtl ?? (labelDirection === "rtl" || valueDirection === "rtl")
  const isMostlyLTR = labelDirection === "ltr"
  const isDriverLabel = /driver name|نام راننده/i.test(label)
  const isShipmentInfoCard = className?.includes("shipment-info-card")
  const theme = (highlightColor || '').toLowerCase()
  const isRedHighlight = theme === "red"
  const isBlueHighlight = theme === "blue"
  const isGreenHighlight = theme === "green"

  return (
    <div
      dir={rightAligned ? "rtl" : "ltr"}
      {...(pdfMode ? { 'data-no-break': true } : {})}
        className={`min-h-[8mm] rounded-lg border px-1.5 py-1.5 ${pdfMode ? '' : 'shadow-sm shadow-blue-100/60'} ${
        // choose glass styles: red, blue, green highlights, or default glass
        glass
          ? isRedHighlight
            ? "border-red-200/60 bg-red-50/30 backdrop-blur-2xl"
            : isBlueHighlight
            ? "border-blue-200/60 bg-sky-50/40 backdrop-blur-2xl"
            : isGreenHighlight
            ? "border-green-200/60 bg-green-50/30 backdrop-blur-2xl"
            : (highlight ? "border-blue-200/60 bg-sky-50/40 backdrop-blur-2xl" : "border-white/80 bg-white/60 backdrop-blur-md")
          : "border-blue-100 bg-white"
      } ${rightAligned ? "text-right" : "text-left"} break-word ${className || ""}`}
      style={{ ...(pdfMode ? { background: '#fff' } : undefined), unicodeBidi: 'plaintext' }}
    >
      <p
        className={`${isDriverLabel ? "text-[7.2pt]" : isShipmentInfoCard ? "text-[7.2pt]" : (compact ? "text-[6.8pt]" : "text-[7.2pt]")} ${isDriverLabel ? "font-extrabold" : "font-black"} tracking-wide text-blue-700 ${isMostlyLTR ? "uppercase" : ""} ${
          (labelDirection === "rtl" || /[\u0600-\u06FF]/.test(label)) ? "persian-text bol-persian-text font-[vazirmatn]" : ""
        }`}
        dir={rightAligned ? "rtl" : "ltr"}
        style={{ unicodeBidi: "plaintext", color: "#1d4ed8" }}
      >
        {label}
      </p>
      <TextLines
        value={cleanText(value)}
        className={`${important ? (compact ? "text-[10.5pt]" : isShipmentInfoCard ? "text-[9.5pt]" : "text-[10.0pt]") : (compact ? "text-[10.5pt]" : "text-[9.5pt]")} font-bold leading-tight ${isRedHighlight ? "text-red-700" : isBlueHighlight ? "text-blue-800" : isGreenHighlight ? "text-green-700" : (highlight ? "text-red-600" : (important ? "text-blue-950" : "text-slate-600"))}`}
      />
    </div>
  )
}

function PartyCard({
  title,
  subtitle,
  icon,
  name,
  address,
  contact,
  email,
  glass = false,
  pdfMode = false,
}: {
  title: string
  subtitle: string
  icon: ReactNode
  name?: string
  address?: string
  contact?: string
  email?: string
  glass?: boolean
  pdfMode?: boolean
}) {
  if (![name, address, contact, email].some(hasValue)) return null

  return (
    <div
      {...(pdfMode ? { 'data-no-break': true } : {})}
      className={`party-card ${glass ? 'party-card-glass' : 'party-card-solid'} ${pdfMode ? 'party-card-pdf' : ''}`}
    >
      <div className={`party-card-header ${glass ? 'party-card-header-glass' : 'party-card-header-solid'}`}>
        <span className="party-card-icon">{icon}</span>
        <div className="party-card-header-text">
          <h4 className="party-card-title">{title}</h4>
          <p className="party-card-subtitle" dir="rtl">
            {subtitle}
          </p>
        </div>
      </div>
      <div className="party-card-body">
        <TextLines value={name} className="party-card-name" />
        <div className="party-card-info-list">
          <div className="party-card-info-row">
            <MapPin className="party-card-info-icon" />
            <TextLines value={address} className="party-card-info-text" />
          </div>
          {hasValue(contact) && (
            <div className="party-card-info-row">
              <Phone className="party-card-info-icon" />
              <TextLines value={contact} className="party-card-info-text" />
            </div>
          )}
          {hasValue(email) && (
            <div className="party-card-info-row">
              <Mail className="party-card-info-icon" />
              <TextLines value={email} className="party-card-info-text" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

type RouteTransportIcon = ComponentType<{ size?: number; strokeWidth?: number }>

type RouteTransportMeta = {
  label: string
  Icon: RouteTransportIcon
  color: string
}

const defaultRouteTransportMeta: RouteTransportMeta = {
  label: "TRUCK",
  Icon: RouteTruckIcon,
  color: "#2563eb",
}

const routeTransportMap: Record<string, RouteTransportMeta> = {
  air: {
    label: "AIR",
    Icon: RouteAirIcon,
    color: "#0f72e6",
  },
  airplane: {
    label: "AIR",
    Icon: RouteAirIcon,
    color: "#0f72e6",
  },
  plane: {
    label: "AIR",
    Icon: RouteAirIcon,
    color: "#0f72e6",
  },
  truck: {
    label: "TRUCK",
    Icon: RouteTruckIcon,
    color: "#2563eb",
  },
  road: {
    label: "TRUCK",
    Icon: RouteTruckIcon,
    color: "#2563eb",
  },
  lorry: {
    label: "TRUCK",
    Icon: RouteTruckIcon,
    color: "#2563eb",
  },
  van: {
    label: "VAN",
    Icon: RouteCarIcon,
    color: "#1d4ed8",
  },
  car: {
    label: "CAR",
    Icon: RouteCarIcon,
    color: "#1d4ed8",
  },
  train: {
    label: "TRAIN",
    Icon: RouteTrainIcon,
    color: "#0f172a",
  },
  rail: {
    label: "TRAIN",
    Icon: RouteTrainIcon,
    color: "#0f172a",
  },
  vessel: {
    label: "VESSEL",
    Icon: RouteVesselIcon,
    color: "#2563eb",
  },
  ship: {
    label: "VESSEL",
    Icon: RouteVesselIcon,
    color: "#2563eb",
  },
  boat: {
    label: "VESSEL",
    Icon: RouteVesselIcon,
    color: "#2563eb",
  },
  sea: {
    label: "VESSEL",
    Icon: RouteVesselIcon,
    color: "#2563eb",
  },
  ocean: {
    label: "VESSEL",
    Icon: RouteVesselIcon,
    color: "#2563eb",
  },
}

export function getRouteTransportMeta(mode?: string): RouteTransportMeta {
  if (!mode || typeof mode !== "string") {
    return defaultRouteTransportMeta
  }

  const normalizedMode = mode.trim().toLowerCase()
  return routeTransportMap[normalizedMode] ?? defaultRouteTransportMeta
}

function TransportIcon({ mode, size = 24 }: { mode?: string; size?: number }) {
  const { Icon } = getRouteTransportMeta(mode)
  return <Icon size={size} strokeWidth={2.4} aria-hidden="true" />
}

function routeModeLabel(mode?: string) {
  const normalizedMode = String(mode || "").trim().toLowerCase()
  if (!normalizedMode) return ""
  switch (normalizedMode) {
    case "airplane":
    case "plane":
    case "air":
      return "AIR"
    case "vessel":
    case "ship":
    case "boat":
    case "sea":
    case "ocean":
      return "VESSEL"
    case "train":
    case "rail":
      return "TRAIN"
    case "road":
    case "truck":
    case "lorry":
      return "TRUCK"
    case "car":
      return "CAR"
    case "van":
      return "VAN"
    default:
      return normalizedMode.toUpperCase()
  }
}

function routeFallbackLabels(location?: string | null) {
  const normalized = cleanText(location).toLowerCase()
  if (!normalized) return { persian: "", pashto: "" }

  if (normalized.includes("kandahar")) {
    return { persian: "\u06a9\u0646\u062f\u0647\u0627\u0631", pashto: "\u06a9\u0646\u062f\u0647\u0627\u0631" }
  }
  if (normalized.includes("nimroz") || normalized.includes("milak")) {
    return {
      persian: "\u0646\u06cc\u0645\u0631\u0648\u0632 / \u0645\u06cc\u0644\u06a9",
      pashto: "\u0646\u06cc\u0645\u0631\u0648\u0632 / \u0645\u06cc\u0644\u06a9",
    }
  }
  if (normalized.includes("dougharoun")) {
    return { persian: "\u062f\u0648\u063a\u0627\u0631\u0648\u0646\u060c \u0627\u06cc\u0631\u0627\u0646", pashto: "\u062f\u0648\u063a\u0627\u0631\u0648\u0646\u060c \u0627\u06cc\u0631\u0627\u0646" }
  }
  if (normalized.includes("dubai")) {
    return {
      persian: "\u062f\u0628\u06cc\u060c \u0627\u0645\u0627\u0631\u0627\u062a",
      pashto: "\u062f\u0628\u06cc\u060c \u0627\u0645\u0627\u0631\u0627\u062a",
    }
  }
  if (normalized.includes("iran") || normalized.includes("bandar abbas")) {
    return { persian: "\u0627\u06cc\u0631\u0627\u0646", pashto: "\u0627\u06cc\u0631\u0627\u0646" }
  }
  if (normalized.includes("nhava") || normalized.includes("sheva") || normalized.includes("india")) {
    return {
      persian: "\u0628\u0646\u062f\u0631 \u0646\u0627\u0648\u0627\u0634\u06cc\u0648\u0627",
      pashto: "\u0628\u0646\u062f\u0631 \u0646\u0627\u0648\u0627\u0634\u06cc\u0648\u0627",
    }
  }

  return { persian: "", pashto: "" }
}

function countryCodeToEmoji(countryCode?: string) {
  if (!countryCode) return ""
  const code = countryCode.trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return ""
  return code
    .split("")
    .map((char) => String.fromCodePoint(0x1f1e6 + char.charCodeAt(0) - 65))
    .join("")
}

function getRouteCountryMeta(location?: string, locationPersian?: string) {
  const source = String(location || locationPersian || "").trim()
  if (!source) return { emoji: "", label: "" }

  const codeMatch = source.match(/,\s*([A-Za-z]{2})$/)
  const normalized = source.toLowerCase()

  const countryMatch = codeMatch?.[1]?.toUpperCase() ||
    (normalized.includes("afghanistan") || normalized.includes("kandahar") || normalized.includes("nimroz") || normalized.includes("milak") || normalized.includes("dougharoun") ? "AF" :
    normalized.includes("iran") || normalized.includes("bandar abbas") || normalized.includes("tehran") ? "IR" :
    normalized.includes("india") || normalized.includes("nhava") || normalized.includes("sheva") || normalized.includes("mumbai") || normalized.includes("delhi") ? "IN" :
    normalized.includes("dubai") || normalized.includes("emirates") || normalized.includes("uae") ? "AE" :
    normalized.includes("pakistan") || normalized.includes("quetta") || normalized.includes("chaman") ? "PK" :
    normalized.includes("china") || normalized.includes("beijing") || normalized.includes("shanghai") || normalized.includes("qingdao") ? "CN" :
    normalized.includes("turkey") || normalized.includes("istanbul") || normalized.includes("ankara") ? "TR" :
    normalized.includes("russia") || normalized.includes("moscow") || normalized.includes("saint petersburg") || normalized.includes("st petersburg") ? "RU" :
    normalized.includes("usa") || normalized.includes("us") || normalized.includes("united states") || normalized.includes("america") ? "US" :
    normalized.includes("canada") ? "CA" :
    normalized.includes("united kingdom") || normalized.includes("gb") || normalized.includes("britain") || normalized.includes("england") ? "GB" :
    "")

  const emoji = countryCodeToEmoji(countryMatch)
  const labelMap: Record<string, string> = {
    AF: "Afghanistan",
    IR: "Iran",
    IN: "India",
    AE: "UAE",
    PK: "Pakistan",
    CN: "China",
    TR: "Turkey",
    RU: "Russia",
    US: "USA",
    CA: "Canada",
    GB: "UK",
  }

  return {
    emoji,
    label: emoji ? labelMap[countryMatch] ?? countryMatch : "",
  }
}

function RouteTimeline({ routes, glass = false }: { routes: BillOfLadingFormData["routes"]; glass?: boolean }) {
  if (!routes?.length) return null

  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(routes[0]?.id ?? null)

  const handleRouteSelect = (routeId: string) => {
    setSelectedRouteId(routeId)
  }

  return (
    <div className={`route-timeline-container ${glass ? "glass-card" : ""}`} aria-label="Route and transportation path timeline">
      {/* World Map Background */}
      <svg
        viewBox="0 0 1200 400"
        preserveAspectRatio="none"
        className="route-timeline-map"
        aria-hidden="true"
      >
        <defs>
          <filter id="map-shadow">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.15" />
            </feComponentTransfer>
          </filter>
        </defs>
        {/* Simplified world map shapes (light gray) */}
        <g fill="#d4e4f7" opacity="0.4" filter="url(#map-shadow)">
          {/* Africa outline (simplified) */}
          <path d="M 400 100 Q 420 80 440 100 Q 450 140 440 180 Q 420 200 400 180 Q 390 140 400 100 Z" />
          {/* Americas outline (simplified) */}
          <path d="M 100 80 Q 80 120 100 160 Q 120 180 140 160 Q 130 120 100 80 Z" />
          {/* Asia outline (simplified) */}
          <path d="M 600 60 Q 750 50 850 80 Q 850 140 750 160 Q 650 150 600 120 Z" />
          {/* Europe outline (simplified) */}
          <path d="M 380 40 Q 420 30 460 50 Q 450 80 400 90 Q 370 70 380 40 Z" />
        </g>
      </svg>

      {/* Connection Line */}
      <div className="route-timeline-connector" aria-hidden="true" />

      {/* Route Cards Container */}
      <div className="route-timeline-cards" role="list">
        {routes.map((route, index) => {
          const mode = route.transportMode || "truck"
          const fallback = routeFallbackLabels(route.location)
          const persianLabel = cleanText(route.locationPersian) || fallback.persian
          const pashtoLabel = fallback.pashto || persianLabel
          const showPashtoLabel = hasValue(pashtoLabel) && cleanText(pashtoLabel) !== cleanText(persianLabel)
          const isSelected = selectedRouteId === route.id
          const countryMeta = isSelected ? getRouteCountryMeta(route.location, route.locationPersian) : { emoji: "", label: "" }
          const routeMeta = getRouteTransportMeta(mode)
          const isLastRoute = index === routes.length - 1

          return (
            <div key={route.id || `${route.location}-${index}`} className="route-timeline-item" role="listitem">
              <button
                type="button"
                className={`route-timeline-card${isSelected ? " selected" : ""}`}
                onClick={() => handleRouteSelect(route.id)}
                style={{ "--route-transport-color": routeMeta.color } as CSSProperties}
              >
                <div className="route-timeline-path-icon" aria-hidden="true">
                  <TransportIcon mode={mode} size={34} />
                </div>

                {/* Card Content */}
                <div className="route-timeline-content">
                  <div className="route-timeline-label">
                    {route.stopLabel || routeModeLabel(mode)}
                  </div>
                  {countryMeta.emoji ? (
                    <div className="route-timeline-flag-wrapper" aria-label={`Country flag ${countryMeta.label}`}>
                      <div className="route-timeline-flag" aria-hidden="true">
                        {countryMeta.emoji}
                      </div>
                      {countryMeta.label ? (
                        <span className="route-timeline-flag-label">{countryMeta.label}</span>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="route-timeline-location">
                    {cleanText(route.location)}
                  </div>
                  {hasValue(persianLabel) && (
                    <div className="route-timeline-location-local" dir="rtl">
                      {persianLabel}
                    </div>
                  )}
                  {showPashtoLabel && (
                    <div className="route-timeline-location-local" dir="rtl">
                      {pashtoLabel}
                    </div>
                  )}
                  <div className="route-timeline-mode">
                    <span className="route-timeline-mode-icon" aria-hidden="true">
                      <TransportIcon mode={mode} size={15} />
                    </span>
                    {routeModeLabel(mode)}
                  </div>

                  {/* Truck Specification & Customs Seal Badges inside Route Card */}
                  {(route.plateNumber || route.chassisNumber || route.trailerMan || route.customsSealRequired) && (
                    <div className="mt-1.5 pt-1.5 border-t border-slate-200/80 space-y-1 text-left w-full">
                      {route.plateNumber && (
                        <div className="inline-flex items-center gap-1 bg-blue-100/90 text-blue-950 font-mono font-black text-[7.5pt] px-1.5 py-0.5 rounded border border-blue-200">
                          <span>پلیټ:</span>
                          <span>{route.plateNumber}</span>
                        </div>
                      )}
                      {route.chassisNumber && (
                        <div className="text-[7.5pt] font-extrabold text-slate-800">
                          <span className="text-slate-500">شاسی:</span> {route.chassisNumber}
                        </div>
                      )}
                      {route.trailerMan && (
                        <div className="text-[7.5pt] font-extrabold text-slate-800 truncate" dir="rtl font-[vazirmatn]">
                          <span className="text-slate-500">ټیلر مان:</span> {route.trailerMan}
                        </div>
                      )}
                      {route.customsSealRequired && (
                        <div className="mt-0.5 bg-amber-100 text-amber-950 font-black text-[7.5pt] px-1.5 py-0.5 rounded border border-amber-300 flex items-center gap-1" dir="rtl font-[vazirmatn]">
                          <span>📍 په ګمرک کې سیل غواړي</span>
                          {route.customsSealNote ? <span className="font-semibold text-amber-800">({route.customsSealNote})</span> : null}
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </button>
              {!isLastRoute && (
                <div className="route-timeline-arrow" aria-hidden="true">
                  <ArrowRight className="route-timeline-arrow-icon" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function A4Preview({
  bolNumber,
  issueDate,
  persianDateNumeric,
  formData,
  logoUrl,
  companyName,
  companyNamePersian,
  companySubtitle,
  companyPhone,
  companyEmail,
  companyAddress,
  companyLicence,
  exportTarget = false,
  pdfExport = false,
  includeColorStrip = true,
}: A4PreviewProps) {
  const pdfMode = exportTarget || pdfExport
  const companyTitle = cleanText(companyName) || "SKY ARIANA & BALAM BAR BARAN"
  const companyTagline = cleanText(companySubtitle) || "Import & Export - International Transportation"
  const companyPersian = cleanText(companyNamePersian) || labels.persianCompanyFallback
  const companyFooter = joinOfficeLine([
    companyPhone,
    companyEmail,
    companyLicence ? `Licence: ${companyLicence}` : undefined,
  ])
  const companyAddressLine =
    cleanText(companyAddress) ||
    "2nd Floor, 16 No. Office, Shahidano, Chowk, Etimad Rahmi Market, Kandahar, Afghanistan"
  const iranOffice = joinOfficeLine([
    formData.iran_office_building ? `IRAN OFFICE: ${formData.iran_office_building}` : undefined,
    formData.iran_office_location,
    formData.iran_office_pobox ? `P.O.Box: ${formData.iran_office_pobox}` : undefined,
    formData.iran_office_telefax ? `Tel/Fax: ${formData.iran_office_telefax}` : undefined,
    formData.iran_office_cellphone ? `Cell: ${formData.iran_office_cellphone}` : undefined,
    formData.iran_office_email ? `Email: ${formData.iran_office_email}` : undefined,
  ])

  const contactItems: DetailItem[] = [
    { label: formData.notes_1_label || "Contact Phone", value: formData.notes_1, important: true, rtl: true, highlight: true, highlightColor: formData.notes_1_theme || "red" },
    { label: formData.notes_2_label || "Exporter Information", value: formData.notes_2, important: true, rtl: true, highlight: true, highlightColor: formData.notes_2_theme || "red" },
  ]

  const driverNameVal = formData.driver_name || ""
  const driverFatherNameVal = formData.driver_father_name ? ` S/O ${formData.driver_father_name}` : ""
  const driverFullInfo = driverNameVal || driverFatherNameVal ? `${driverNameVal}${driverFatherNameVal}` : undefined

  const combinedDateVal = [issueDate, persianDateNumeric].filter(Boolean).join("\n")

  const shipmentItems: DetailItem[] = [
    { label: "Truck Number / شماره کامیون", value: formData.truck_number, important: true, highlight: true },
    { label: "Driver Name / نام راننده", value: driverFullInfo, important: true, highlight: true },
    { label: "Driver Contact / تماس راننده", value: formData.driver_contact, highlight: true },
    { label: "Driver Rent / کرایه راننده", value: formData.driver_rent, highlight: true },
    { label: "Date / تاریخ / شمسی", value: combinedDateVal, important: true },
  ]

  const cargoSummaryItems: DetailItem[] = [
    { label: `Container No. / ${labels.containerNoFa}`, value: formData.container_numbers, important: true },
    { label: `Seal No. / ${labels.sealNoFa}`, value: formData.seal_numbers, important: true },
    { label: `No. of Packages / ${labels.packagesFa}`, value: formData.number_of_packages, important: true },
    { label: `KGS per Carton / ${labels.kgsPerCartonFa}`, value: formData.kgs_per_carton, important: true },
    { label: `Gross Weight per Carton KGS / ${labels.grossPerCartonFa}`, value: formData.gross_weight_per_carton, important: true },
    { label: `Rate per KGS / ${labels.rateFa}`, value: formData.rate_per_kgs, important: true },
    { label: `Goods Value / ${labels.goodsValueFa}`, value: formData.goods_value, important: true },
    { label: `Net Weight / ${labels.netWeightFa}`, value: formData.net_weight, important: true },
    { label: `Gross Weight / ${labels.grossWeightFa}`, value: formData.gross_weight, important: true },
    { label: `Measurement / ${labels.measurementFa}`, value: formData.measurement },
  ]

  return (
    <div
      data-bol-a4="true"
      data-pdf-export={pdfMode ? "true" : undefined}
      data-color-strip={includeColorStrip ? "true" : "false"}
      className="mx-auto flex min-h-[297mm] w-[210mm] max-w-[210mm] flex-col overflow-hidden text-slate-950 shadow-2xl shadow-blue-200/50 ring-1 ring-blue-100 print:m-0 print:h-[297mm] print:min-h-0 print:w-[210mm] print:max-w-none print:shadow-none"
      style={pdfMode ? { ...a4ShellStyle, width: "210mm", minHeight: "297mm", height: "297mm", overflow: "hidden" } : a4ShellStyle}
    >
      <div data-bol-page="true" className="relative flex h-full flex-col p-[3mm] print:p-[1.5mm] gap-[2mm] print:gap-[1mm] print:overflow-visible">
        <header
          data-bol-header="true"
          className={`overflow-hidden rounded-2xl border shrink-0 ${
            pdfMode ? "border-blue-200 bg-white" : "border-white/80 bg-white/60 backdrop-blur-xl shadow-lg shadow-blue-100/70"
          }`}
          style={pdfMode ? { boxShadow: "none" } : undefined}
        >
          <div className="p-2.5" style={headerGridStyle}>
            <div
              className={`rounded-xl border p-1 shadow-md shadow-blue-100/60 ${
                pdfMode ? "border-blue-100 bg-white" : "border-white/80 bg-white/70 backdrop-blur-lg"
              }`}
              style={logoFrameStyle}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl || "/images/logo.png"}
                alt="Company logo"
                className="logo object-contain"
                style={logoImageStyle}
              />
            </div>

            <div className="bol-company-block min-w-0 px-1 text-center">
              <h1 className={`bol-company-name english-text font-black uppercase tracking-tight text-blue-950 ${pdfMode ? "text-[15.4pt]" : "text-[16.6pt]"}`}>
                {companyTitle}
              </h1>
              <p className={`english-text mt-0.5 font-bold text-slate-600 ${pdfMode ? "text-[8.8pt]" : "text-[6.8pt]"}`}>{companyTagline}</p>
              <p className={`persian-text bol-persian-text mt-0.5 font-[vazirmatn] font-black leading-tight text-blue-800 ${pdfMode ? "text-[10.5pt]" : "text-[9.5pt]"}`} dir="rtl">
                {companyPersian}
              </p>
            </div>

            <div
              data-bol-title-card="true"
              className={`bol-title-card overflow-hidden rounded-xl border shadow-md shadow-blue-100/70 ${
                pdfMode ? "border-blue-200 bg-white" : "border-white/80 bg-white/70 backdrop-blur-lg"
              }`}
            >
              <div className="bol-title-box px-2 py-1.5 text-center text-white" style={darkHeaderStyle}>
                <p className="bol-title-en english-text text-[12.2pt] font-black uppercase leading-tight">Bill of Lading</p>
                <p className="bol-title-fa persian-text bol-persian-text font-[vazirmatn] text-[12.2pt] font-bold leading-tight" dir="rtl">
                  {labels.billOfLadingFa}
                </p>
              </div>
              <div data-pdf-bol-badge="true" className="bol-number-box flex min-h-8 items-center justify-center bg-white px-2 py-1.5">
                <span
                  data-pdf-bol-number="true"
                  className="bol-number-text block w-full text-center font-mono text-[9.6pt] font-black leading-tight text-blue-900"
                  style={{ color: "#1e3a8a", fontFamily: "Arial, Helvetica, sans-serif" }}
                >
                  {bolNumber}
                </span>
              </div>
            </div>
          </div>
        </header>

        <main
          data-bol-content="true"
          className={`mt-0 flex min-h-0 flex-1 flex-col gap-[3mm] print:gap-[2mm] ${pdfMode ? "overflow-visible" : "overflow-y-auto"}`}
        >
          <Section title="Shipment Information" subtitle={labels.shipmentInfoFa} icon={<CalendarDays className="h-6 w-6" />} glass={!pdfMode} printKey="shipment" pdfMode={pdfMode} titleClassName="text-[10.2pt]">
            <div className="grid grid-cols-5 gap-1.5">
              {shipmentItems.map((item) => (
                <DetailCard key={item.label} {...item} glass={!pdfMode} pdfMode={pdfMode} className="shipment-info-card" />
              ))}
            </div>
          </Section>

          <Section title="Exporter Contacts" subtitle={labels.exporterContactsFa} icon={<Phone className="h-6 w-6" />} glass={!pdfMode} printKey="contacts" pdfMode={pdfMode}>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {contactItems.map((item) => (
                <DetailCard key={item.label} {...item} glass={!pdfMode} pdfMode={pdfMode} compact className="exporter-contact-detail-card" />
              ))}
            </div>
            <div className="mt-0 grid grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3 print:gap-0 print:mt-0">
              <PartyCard
                title="Exporter Information"
                subtitle={labels.exporterInfoFa}
                icon={<Building2 className="h-6 w-6" />}
                name={formData.shipper_name}
                address={formData.shipper_address}
                contact={formData.shipper_contact}
                email={formData.shipper_email}
                glass={!pdfMode}
                pdfMode={pdfMode}
              />
              <PartyCard
                title="Consignee Information"
                subtitle={labels.consigneeInfoFa}
                icon={<UserRound className="h-6 w-6" />}
                name={formData.consignee_name}
                address={formData.consignee_address}
                contact={formData.consignee_contact}
                email={formData.consignee_email}
                glass={!pdfMode}
                pdfMode={pdfMode}
              />
              <PartyCard
                title="Notify Party"
                subtitle={labels.notifyPartyFa}
                icon={<Mail className="h-6 w-6" />}
                name={formData.notify_party}
                address={formData.notify_party_address}
                contact={undefined}
                email={undefined}
                glass={!pdfMode}
                pdfMode={pdfMode}
              />
            </div>
          </Section>

          <Section title="Route / Transportation Path" subtitle={labels.routeFa} icon={<Route className="h-6 w-6" />} glass={!pdfMode} printKey="route" pdfMode={pdfMode}>
            <RouteTimeline routes={formData.routes} glass={!pdfMode} />
            
            {/* Dedicated Truck Details & Customs Seal Summary Bar */}
            {formData.routes.some(r => r.plateNumber || r.chassisNumber || r.trailerMan || r.customsSealRequired) && (
              <div className="mt-2 rounded-xl border border-blue-200 bg-linear-to-r from-blue-50/90 via-white to-amber-50/70 p-2 shadow-xs text-xs font-bold text-slate-900">
                <div className="flex items-center justify-between border-b border-blue-200/60 pb-1 mb-1.5 text-[8.5pt] font-black text-blue-950">
                  <div className="flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 text-blue-700" />
                    <span>Truck Transportation Specifications / مشخصات حمل موتر و ګمرک</span>
                  </div>
                  <span className="font-[vazirmatn] text-amber-800 text-[8pt]" dir="rtl">جزئیات پلیټ، شاسی و سیل ګمرک</span>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {formData.routes.map((r, i) => {
                    if (!r.plateNumber && !r.chassisNumber && !r.trailerMan && !r.customsSealRequired) return null
                    return (
                      <div key={r.id || i} className="rounded-lg border border-blue-100 bg-white p-1.5 space-y-0.5">
                        <div className="flex items-center justify-between text-[7.5pt] font-black text-blue-900 border-b border-slate-100 pb-0.5">
                          <span>Stop #{i + 1}: {r.location || `Stop ${i+1}`}</span>
                          {r.transportMode && <span className="uppercase text-[7pt] bg-blue-100 px-1 rounded text-blue-900">{r.transportMode}</span>}
                        </div>
                        {r.plateNumber && (
                          <div className="text-[7.5pt] font-bold text-slate-800">
                            <span className="text-slate-500">Plate / پلیټ:</span> <span className="font-mono font-black text-blue-950">{r.plateNumber}</span>
                          </div>
                        )}
                        {r.chassisNumber && (
                          <div className="text-[7.5pt] font-bold text-slate-800">
                            <span className="text-slate-500">Chassis / شاسی:</span> <span className="font-mono">{r.chassisNumber}</span>
                          </div>
                        )}
                        {r.trailerMan && (
                          <div className="text-[7.5pt] font-bold text-slate-800 font-[vazirmatn]" dir="rtl">
                            <span className="text-slate-500">Trailer Man / ټیلر مان:</span> <span className="font-black text-slate-900">{r.trailerMan}</span>
                          </div>
                        )}
                        {r.customsSealRequired && (
                          <div className="mt-0.5 rounded bg-amber-100 p-1 text-[7.5pt] font-black text-amber-950 font-[vazirmatn]" dir="rtl">
                            📍 په ګمرک کې سیل غواړي {r.customsSealNote ? `- ${r.customsSealNote}` : ""}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </Section>

          <Section title="Cargo Description" subtitle={labels.cargoDescFa} icon={<Package className="h-6 w-6" />} glass={!pdfMode} printKey="cargo" pdfMode={pdfMode} titleClassName="text-[10.2pt]">
            <div className="grid grid-cols-5 gap-1 break-word" style={{ gridAutoRows: 'minmax(32px, auto)' }}>
              {cargoSummaryItems.map((item) => (
                <DetailCard key={item.label} {...item} glass={!pdfMode} pdfMode={pdfMode} compact />
              ))}
            </div>
            <div
              className={`mt-1.5 rounded-xl border p-2 shadow-inner ${
                pdfMode ? "border-blue-100 bg-white" : "border-white/80 bg-white/65 backdrop-blur-md"
              }`}
            >
              <div className="mb-1 flex items-center gap-1.5 text-blue-800">
                <FileText className="h-4.5 w-4.5" />
                <p className="text-[9.5pt] font-black leading-tight">
                  Description of Goods / <span className="persian-text bol-persian-text" dir="rtl">{labels.goodsDescriptionFa}</span>
                </p>
              </div>
              <TextLines
                value={formData.cargo_description}
                className="text-[10.2pt] font-bold leading-[1.25] text-slate-950"
              />
            </div>
          </Section>

          <div data-no-break className="mt-auto flex justify-center pt-0.5 flex-shrink-0">
            <div
              className={`w-full max-w-[100mm] rounded-xl border border-dashed p-2 text-center shadow-md shadow-blue-100/70 print:shadow-none ${
                pdfMode ? "border-blue-300 bg-white" : "border-white/80 bg-white/65 backdrop-blur-md"
              }`}
            >
              <div className="flex h-10 items-center justify-center rounded-lg bg-blue-50 text-[7pt] italic text-blue-500">
                Stamp / <span className="persian-text bol-persian-text" dir="rtl">{labels.stampFa}</span>
              </div>
              <p className="mt-1 text-[12.2pt] font-black text-blue-950">Company Stamp & Sign</p>
              <p className="persian-text bol-persian-text font-[vazirmatn] text-[12.2pt] font-bold text-slate-500" dir="rtl">
                {labels.companyStampSignFa}
              </p>
            </div>
          </div>
        </main>

        <footer
          data-bol-footer="true"
          className={`mt-1.5 overflow-hidden rounded-xl border text-center shadow-md shadow-blue-100/70 ${
            pdfMode ? "border-blue-200 bg-white" : "border-white/80 bg-white/70 backdrop-blur-lg"
          }`}
          data-no-break
        >
          <div className="px-2.5 py-1.5 text-white" style={blueBarStyle}>
            <p className="text-[5.8pt] font-black uppercase leading-tight">
              {companyTitle} - {companyTagline}
              {companyFooter && ` | ${companyFooter}`}
            </p>
            <p className="mt-0.5 text-[5.4pt] font-semibold leading-tight">{companyAddressLine}</p>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-2.5 py-1 text-[5.4pt] font-bold text-slate-500">
            <span className="text-left">{iranOffice || "Website: www.skyariana.com"}</span>
            <BadgeCheck className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-right">
              <ShieldCheck className="mr-1 inline h-3 w-3 text-blue-600" />
              A4 PDF Export Ready
            </span>
          </div>
        </footer>
      </div>
    </div>
  )
}
