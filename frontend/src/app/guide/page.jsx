"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Search,
  Cloud,
  HardDrive,
  Cpu,
  Fingerprint,
  CalendarDays,
  FileSpreadsheet,
  Clock,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Info,
  Radio,
  FileText,
  Users,
  Camera,
  Download,
  ShieldCheck,
  Sparkles,
  LayoutDashboard,
  CalendarCheck,
  Building2,
  GitFork,
  History,
  Settings,
  Database,
  CalendarRange,
  GraduationCap,
  Layers,
  ChevronRight,
} from "lucide-react";

export default function UserGuidePage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = [
    { id: "all", label: "ទាំងអស់ (All Features)", icon: BookOpen },
    { id: "gdrive", label: "Google Drive Cloud & Bypass", icon: Cloud, badge: "Important" },
    { id: "core", label: "Dashboard & វត្តមានផ្ទាល់", icon: Radio },
    { id: "hardware", label: "ម៉ាស៊ីនស្កេន ZKTeco", icon: Cpu },
    { id: "organization", label: "បុគ្គលិក សាខា & ផ្នែក", icon: Users },
    { id: "schedules", label: "វេនការងារ & ច្បាប់សម្រាក", icon: Clock },
    { id: "reports", label: "របាយការណ៍ & Export", icon: FileSpreadsheet },
    { id: "backups", label: "បម្រុងទុក Database", icon: HardDrive },
    { id: "admin", label: "សុវត្ថិភាព & ការកំណត់", icon: ShieldCheck },
  ];

  const guideCards = [
    // =========================================================================
    // CATEGORY: GOOGLE DRIVE CLOUD & BYPASS
    // =========================================================================
    {
      id: "gdrive-bypass",
      category: "gdrive",
      title: "របៀបដោះស្រាយ Google Drive: 'Access Blocked / Unverified App'",
      subtitle: "Bypass Google security warning in 1 minute without commercial verification",
      badge: "សំខាន់បំផុត (Essential)",
      badgeColor: "rose",
      steps: [
        {
          num: "1",
          title: "បញ្ចូល Gmail របស់អ្នកទៅក្នុង 'Test Users' (Google Cloud Console)",
          desc: "ចូលទៅកាន់ Google Cloud Console &rarr; OAuth Consent Screen &rarr; រំកិលចុះក្រោមរកមើលពាក្យ 'Test users' &rarr; ចុច '+ ADD USERS' &rarr; សរសេរ Gmail ផ្ទាល់ខ្លួនរបស់អ្នក រួចចុច 'SAVE'។",
          link: "https://console.cloud.google.com/apis/credentials/consent?project=884517582498",
          linkText: "បើក Google Cloud Console &rarr;",
          diagram: (
            <div className="p-3.5 rounded-xl bg-slate-900 text-slate-200 border border-slate-800 space-y-2 font-mono text-[11px]">
              <div className="flex justify-between border-b border-slate-800 pb-1.5 text-slate-400">
                <span>OAuth Consent Screen &bull; Test users</span>
                <span className="text-amber-400 font-bold">Status: Testing</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-white font-bold">[ + ADD USERS ]</span>
                <span className="text-emerald-400">&larr; បញ្ចូល Gmail ផ្ទាល់ខ្លួនរបស់អ្នកត្រង់នេះ</span>
              </div>
            </div>
          ),
        },
        {
          num: "2",
          title: "ចុច 'Advanced' រួចចុច 'Go to ZKTeco Attendance Backup (unsafe)'",
          desc: "នៅពេល Google បង្ហាញផ្ទាំង 'Google hasn't verified this app' សូមកុំចុច Back to safety ឱ្យសោះ! ចុចត្រង់ពាក្យតូច Advanced នៅខាងក្រោមឆ្វេង រួចចុច 'Go to ZKTeco Attendance Backup (unsafe)'។",
          diagram: (
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 space-y-2.5 text-slate-800 dark:text-slate-200">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                <span className="font-bold text-xs text-amber-600 flex items-center gap-1">
                  ⚠️ Google hasn&apos;t verified this app
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">Back to safety</span>
              </div>
              <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 space-y-1.5 text-xs">
                <div className="flex items-center gap-2 font-bold text-indigo-700 dark:text-indigo-300">
                  <span>👉 ចុចត្រង់នេះ៖</span>
                  <span className="underline bg-indigo-200/60 dark:bg-indigo-900/60 px-1.5 py-0.5 rounded font-mono">Advanced (កម្រិតខ្ពស់)</span>
                </div>
                <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300">
                  <span>👉 បន្ទាប់មកចុច៖</span>
                  <span className="bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800 font-mono">
                    Go to ZKTeco Attendance Backup (unsafe)
                  </span>
                </div>
              </div>
            </div>
          ),
        },
        {
          num: "3",
          title: "ផ្តល់សិទ្ធិ (Check Permissions) &rarr; ចុច 'Continue'",
          desc: "គ្រីសធីកប្រអប់អនុញ្ញាត Google Drive រួចចុច Continue។ ប្រព័ន្ធនឹងភ្ជាប់គណនី Google Drive ដោយជោគជ័យជាស្ថាពរ ហើយត្រឡប់មកកាន់ Backups វិញ។",
        },
      ],
      actionLink: "/backups",
      actionText: "ទៅកាន់ទំព័រ Backups ដើម្បីភ្ជាប់",
    },

    // =========================================================================
    // CATEGORY: CORE MONITORING (DASHBOARD, LIVE PUNCHES, KIOSK, CORRECTIONS)
    // =========================================================================
    {
      id: "feature-dashboard",
      category: "core",
      title: "ផ្ទាំងគ្រប់គ្រងទូទៅ (Master Dashboard & Realtime KPIs)",
      subtitle: "Overview of today's attendance stats, active devices, and department percentages",
      badge: "Core Monitoring",
      badgeColor: "indigo",
      steps: [
        {
          num: "1",
          title: "តាមដានសន្ទស្សន៍វត្តមានថ្ងៃនេះ (Today Attendance KPIs)",
          desc: "មើលចំនួនបុគ្គលិកសរុប (Total Staff), ចំនួនអ្នកបានស្កេនចូល (Present), ភាគរយវត្តមាន (Attendance Rate), ចំនួនអ្នកមកយឺត (Late), និងអវត្តមាន (Absent)។",
        },
        {
          num: "2",
          title: "ពិនិត្យស្ថានភាពម៉ាស៊ីន (Biometric Device Status)",
          desc: "ប្រអប់ Device Status បង្ហាញម៉ាស៊ីនណាខ្លះកំពុងដំណើរការ (Online ពណ៌បៃតង) ឬដាច់បណ្តាញ (Offline ពណ៌ក្រហម) និងពេលវេលាដែលបានទាញទិន្នន័យចុងក្រោយ។",
        },
        {
          num: "3",
          title: "តាមដានសកម្មភាពស្កេនចុងក្រោយ (Recent Activity Feed)",
          desc: "បង្ហាញឈ្មោះ រូបថត និងម៉ោងស្កេនរបស់បុគ្គលិកដែលទើបតែស្កេនមេដៃ ឬផ្ទៃមុខតាមពេលវេលាជាក់ស្តែង។",
        },
      ],
      actionLink: "/dashboard",
      actionText: "ទៅកាន់ Dashboard",
    },
    {
      id: "feature-live-punches",
      category: "core",
      title: "វត្តមានផ្ទាល់ (Live Punch Scans & Realtime Socket)",
      subtitle: "Instant attendance stream direct from ZKTeco devices via Python TCP Daemon",
      badge: "Realtime",
      badgeColor: "emerald",
      steps: [
        {
          num: "1",
          title: "បើកទំព័រ Live Punches",
          desc: "ចូលទៅកាន់ Attendance &rarr; Live Punch Scans (/attendance/punches)។ កុំព្យូទ័រនឹងភ្ជាប់ WebSocket ដោយស្វ័យប្រវត្តិតាមរយៈ Port 8484។",
        },
        {
          num: "2",
          title: "ស្កេនលើម៉ាស៊ីន ZKTeco",
          desc: "នៅពេលបុគ្គលិកស្កេនមេដៃ ផ្ទៃមុខ ឬកាត RFID លើម៉ាស៊ីន IN01-A ឬម៉ាស៊ីនដទៃទៀត ប្រព័ន្ធនឹងចាប់យក Punch នោះភ្លាមៗក្នុងរយៈពេលក្រោម 1 វិនាទី។",
        },
        {
          num: "3",
          title: "ប្រភេទនៃការស្កេន (Punch States)",
          desc: "ប្រព័ន្ធបង្ហាញច្បាស់លាស់៖ Check In (ចូលធ្វើការ), Check Out (ចេញទៅផ្ទះ), Break Out (ចេញបាយ), Break In (ត្រឡប់ពីបាយ), OT In/Out (ថែមម៉ោង)។",
        },
      ],
      actionLink: "/attendance/punches",
      actionText: "មើល Live Punches",
    },
    {
      id: "feature-kiosk",
      category: "core",
      title: "កាមេរ៉ាស្កេនផ្ទៃមុខ AI (Browser Face Kiosk)",
      subtitle: "Webcam biometric punch kiosk using Face-API neural networks with voice greetings",
      badge: "AI Powered",
      badgeColor: "sky",
      steps: [
        {
          num: "1",
          title: "បើកដំណើរការកាមេរ៉ា (Enable Camera)",
          desc: "ចូលទៅកាន់ /attendance/live &rarr; ចុច 'Start Camera' ហើយអនុញ្ញាត (Allow) សិទ្ធិកាមេរ៉ាក្នុង Browser។",
        },
        {
          num: "2",
          title: "ការស្គាល់ផ្ទៃមុខដោយស្វ័យប្រវត្តិ (Neural Face Detection)",
          desc: "នៅពេលបុគ្គលិកឈរពីមុខកាមេរ៉ា ប្រព័ន្ធ AI នឹងគូសប្រអប់សម្គាល់ផ្ទៃមុខ ផ្គូផ្គងជាមួយរូបថតក្នុងទិន្នន័យ និងកត់ត្រាវត្តមានភ្លាមៗ។",
        },
        {
          num: "3",
          title: "សំឡេងស្វាគមន៍ (Voice Feedback)",
          desc: "ប្រព័ន្ធនឹងបន្លឺសំឡេងស្វាគមន៍ជាភាសាខ្មែរ ឬអង់គ្លេសបញ្ជាក់ថា 'វត្តមានទទួលបានជោគជ័យ'។",
        },
      ],
      actionLink: "/attendance/live",
      actionText: "បើក Face Kiosk",
    },
    {
      id: "feature-daily-attendance",
      category: "core",
      title: "ការគណនាវត្តមានប្រចាំថ្ងៃ (Daily Attendance Calculations)",
      subtitle: "First-In Last-Out engine, Late Arrival, Early Departure, and Overtime computation",
      badge: "Automated",
      badgeColor: "emerald",
      steps: [
        {
          num: "1",
          title: "ក្បួនគណនាស្វ័យប្រវត្តិ (First-In Last-Out)",
          desc: "ប្រព័ន្ធស្វែងរកការស្កេនដំបូងបំផុតជា Check-In និងការស្កេនចុងក្រោយបំផុតជា Check-Out សម្រាប់ថ្ងៃនីមួយៗ។",
        },
        {
          num: "2",
          title: "ការកំណត់ស្ថានភាព (Status Badges)",
          desc: "រួមមាន៖ On Time (ទាន់ពេល), Late (មកយឺត), Early Departure (ចេញមុន), Half Day (កន្លះថ្ងៃ), Absent (អវត្តមាន), On Leave (ច្បាប់), Holiday (ថ្ងៃបុណ្យ)។",
        },
        {
          num: "3",
          title: "តម្រៀប និងស្វែងរក (Filters)",
          desc: "អាច Filter មើលតាមថ្ងៃ សាខា ដេប៉ាតឺម៉ង់ ឬឈ្មោះបុគ្គលិកជាក់លាក់។",
        },
      ],
      actionLink: "/attendance/daily",
      actionText: "ពិនិត្យវត្តមានប្រចាំថ្ងៃ",
    },
    {
      id: "feature-corrections",
      category: "core",
      title: "ការកែតម្រូវវត្តមានដោយដៃ (Attendance Corrections & Audit)",
      subtitle: "Manual punch entry for missed scans with mandatory reason and manager approval",
      badge: "Correction",
      badgeColor: "amber",
      steps: [
        {
          num: "1",
          title: "ពេលណាត្រូវប្រើ? (When to use)",
          desc: "ប្រើនៅពេលបុគ្គលិកភ្លេចស្កេនមេដៃ ឬចេញទៅជួបភ្ញៀវខាងក្រៅមិនបាន Check-out។",
        },
        {
          num: "2",
          title: "ចុច 'Add Correction'",
          desc: "ចូលទៅកាន់ /attendance/corrections &rarr; ជ្រើសរើសឈ្មោះបុគ្គលិក កាលបរិច្ឆេទ ម៉ោងកែតម្រូវ និងប្រភេទ (Check-In ឬ Check-Out)។",
        },
        {
          num: "3",
          title: "បញ្ចូលមូលហេតុ និងអនុម័ត",
          desc: "សរសេរមូលហេតុ (ឧ. 'ភ្លេចស្កេនពេលព្រឹក') រួចចុច Save។ ប្រព័ន្ធនឹងកត់ត្រាឈ្មោះ Admin ដែលបានកែទុកក្នុង Audit Log ដើម្បីតម្លាភាព។",
        },
      ],
      actionLink: "/attendance/corrections",
      actionText: "កែតម្រូវវត្តមាន",
    },

    // =========================================================================
    // CATEGORY: BIOMETRIC HARDWARE (DEVICES, DEVICE USERS)
    // =========================================================================
    {
      id: "feature-devices",
      category: "hardware",
      title: "ការភ្ជាប់ និងគ្រប់គ្រងម៉ាស៊ីនស្កេន (ZKTeco Devices & Terminals)",
      subtitle: "TCP/IP Port 4370 network setup, live ping test, and hardware telemetry",
      badge: "Hardware",
      badgeColor: "sky",
      steps: [
        {
          num: "1",
          title: "កំណត់ IP Address លើម៉ាស៊ីន ZKTeco",
          desc: "នៅលើម៉ាស៊ីន ចុច Menu &rarr; Comm. &rarr; Ethernet &rarr; កំណត់ IP (ឧ. 192.168.1.201), Subnet 255.255.255.0, Gateway 192.168.1.1។",
        },
        {
          num: "2",
          title: "បន្ថែមម៉ាស៊ីនក្នុងប្រព័ន្ធ (Add Device)",
          desc: "ចូលទៅកាន់ Terminals (/devices) &rarr; ចុច '+ Add Device' &rarr; បញ្ចូលឈ្មោះ (ឧ. IN01-A Main Gate), IP Address, Port (4370) និងសាខា។",
        },
        {
          num: "3",
          title: "ធ្វើតេស្តការតភ្ជាប់ (Test Connection)",
          desc: "ចុចប៊ូតុង 'Test Connection' ដើម្បីឱ្យ Server ធ្វើតេស្ត Ping និង TCP handshake ជាមួយម៉ាស៊ីន។",
        },
        {
          num: "4",
          title: "ពិនិត្យព័ត៌មានម៉ាស៊ីន (Device Telemetry)",
          desc: "ប្រព័ន្ធនឹងបង្ហាញ Serial Number, Firmware Version, ចំនួនមេដៃដែលផ្ទុកលើម៉ាស៊ីន, ចំនួន Log, និងកម្រិតផ្ទុក (Capacity)។",
        },
      ],
      actionLink: "/devices",
      actionText: "គ្រប់គ្រងម៉ាស៊ីនស្កេន",
    },
    {
      id: "feature-device-users",
      category: "hardware",
      title: "ការគ្រប់គ្រង និង Sync អ្នកប្រើប្រាស់លើម៉ាស៊ីន (Device Users & Sync)",
      subtitle: "Bi-directional user synchronization, card numbers, and fingerprint enrollment",
      badge: "User Sync",
      badgeColor: "indigo",
      steps: [
        {
          num: "1",
          title: "ទាញយកអ្នកប្រើពីម៉ាស៊ីន (Download Users from Device)",
          desc: "ចូលទៅកាន់ /device-users &rarr; ចុច 'Pull Users from Device' ដើម្បីទាញឈ្មោះ និងលេខ ID ទាំងអស់ពីម៉ាស៊ីនមកកុំព្យូទ័រ។",
        },
        {
          num: "2",
          title: "បញ្ជូនបុគ្គលិកថ្មីទៅម៉ាស៊ីន (Push Users to Device)",
          desc: "នៅពេលបង្កើតបុគ្គលិកថ្មីក្នុងប្រព័ន្ធ ចុច 'Upload to Device' ដើម្បីបញ្ជូនឈ្មោះ និង Privilege (Admin ឬ Normal) ទៅម៉ាស៊ីនដោយមិនបាច់ដើរទៅវាយលើម៉ាស៊ីន។",
        },
        {
          num: "3",
          title: "គ្រប់គ្រងលេខកាត និងសិទ្ធិ",
          desc: "អាចកំណត់ Card Number, Password, និង Privilege លើម៉ាស៊ីនបានយ៉ាងងាយស្រួល។",
        },
      ],
      actionLink: "/device-users",
      actionText: "គ្រប់គ្រង Device Users",
    },

    // =========================================================================
    // CATEGORY: ORGANIZATION PERSONNEL (EMPLOYEES, TEACHERS, STUDENTS, BRANCHES)
    // =========================================================================
    {
      id: "feature-employees",
      category: "organization",
      title: "ការគ្រប់គ្រងបុគ្គលិក (Employee Management)",
      subtitle: "Employee profiles, badge ID, department mapping, hire dates, and avatar pictures",
      badge: "HR Staff",
      badgeColor: "emerald",
      steps: [
        {
          num: "1",
          title: "បង្កើតបុគ្គលិកថ្មី (Add Employee)",
          desc: "ចូលទៅកាន់ Employees (/employees) &rarr; ចុច '+ Add Employee' &rarr; បញ្ចូលឈ្មោះ (ខ្មែរ/អង់គ្លេស), Employee Code, សាខា, ដេប៉ាតឺម៉ង់, និងមុខតំណែង។",
        },
        {
          num: "2",
          title: "ភ្ជាប់ទៅកាន់ Device User ID",
          desc: "កំណត់លេខសម្គាល់ Device User ID (លេខដែលស្កេនលើម៉ាស៊ីន) ឱ្យដូចគ្នា ដើម្បីឱ្យការស្កេនស្គាល់ឈ្មោះបុគ្គលិកត្រឹមត្រូវ។",
        },
        {
          num: "3",
          title: "ផ្ទុកឡើងរូបថតបុគ្គលិក (Profile Picture)",
          desc: "Upload រូបថតបុគ្គលិក។ រូបថតនេះនឹងបង្ហាញនៅលើផ្ទាំង Live Punches និងប្រើសម្រាប់ម៉ូឌែល Face Recognition AI។",
        },
      ],
      actionLink: "/employees",
      actionText: "គ្រប់គ្រងបុគ្គលិក",
    },
    {
      id: "feature-teachers-students",
      category: "organization",
      title: "ម៉ូឌុលសាលារៀន៖ សាស្ត្រាចារ្យ និងសិស្ស (Teachers & Students)",
      subtitle: "Specialized academic attendance tracking for schools, faculties, and grade levels",
      badge: "School Module",
      badgeColor: "sky",
      steps: [
        {
          num: "1",
          title: "គ្រប់គ្រងគ្រូបង្រៀន (Teachers - /teachers)",
          desc: "គ្រប់គ្រងបញ្ជីសាស្រ្តាចារ្យ មុខវិជ្ជាបង្រៀន ដេប៉ាតឺម៉ង់ និងវេនការងារបង្រៀន។",
        },
        {
          num: "2",
          title: "គ្រប់គ្រងសិស្សានុសិស្ស (Students - /students)",
          desc: "គ្រប់គ្រងបញ្ជីឈ្មោះសិស្ស ថ្នាក់រៀន (Grade/Class) លេខកាតសិស្ស និងព័ត៌មានទំនាក់ទំនងអាណាព្យាបាល។",
        },
      ],
      actionLink: "/teachers",
      actionText: "មើលគ្រូបង្រៀន",
    },
    {
      id: "feature-branches-depts",
      category: "organization",
      title: "សាខា និងដេប៉ាតឺម៉ង់ (Branches & Departments)",
      subtitle: "Multi-branch architecture, campus hierarchy, and department structure",
      badge: "Structure",
      badgeColor: "indigo",
      steps: [
        {
          num: "1",
          title: "គ្រប់គ្រងសាខា (Branches - /branches)",
          desc: "បង្កើតសាខា (ឧ. ទីស្នាក់ការកណ្តាល HQ, សាខាទី១, សាខាទី២) ជាមួយអាសយដ្ឋាន លេខទូរស័ព្ទ និងតំបន់ម៉ោង។",
        },
        {
          num: "2",
          title: "គ្រប់គ្រងដេប៉ាតឺម៉ង់ (Departments - /departments)",
          desc: "បង្កើតផ្នែកក្រោមសាខានីមួយៗ (ឧ. IT, HR, គណនេយ្យ, រដ្ឋបាល) ដើម្បីងាយស្រួលតម្រៀប និងទាញរបាយការណ៍។",
        },
      ],
      actionLink: "/branches",
      actionText: "គ្រប់គ្រងសាខា",
    },

    // =========================================================================
    // CATEGORY: SCHEDULES & LEAVES (SHIFTS, SCHEDULES, LEAVES, HOLIDAYS)
    // =========================================================================
    {
      id: "feature-shifts",
      category: "schedules",
      title: "វេនការងារ និងម៉ោងអនុគ្រោះ (Work Shifts & Grace Periods)",
      subtitle: "Standard hours, flexible shifts, lunch breaks, and late arrival grace minutes",
      badge: "Time Rules",
      badgeColor: "amber",
      steps: [
        {
          num: "1",
          title: "កំណត់ម៉ោងចាប់ផ្តើម និងបញ្ចប់ (Start / End Time)",
          desc: "ចូលទៅកាន់ Shifts (/shifts) &rarr; បង្កើតវេនការងារ ឧទាហរណ៍៖ វេនពេញម៉ោង 08:00 - 17:00 ឬវេនកន្លះថ្ងៃ។",
        },
        {
          num: "2",
          title: "កំណត់នាទីអនុគ្រោះ (Grace Minutes)",
          desc: "កំណត់ចំនួននាទីអនុគ្រោះមកយឺត (Late Grace) ឧ. 15 នាទី។ ប្រសិនបើបុគ្គលិកស្កេនម៉ោង 08:12 នោះប្រព័ន្ធមិនគិតថាយឺតឡើយ។",
        },
        {
          num: "3",
          title: "កំណត់ម៉ោងសម្រាកបាយថ្ងៃត្រង់ (Lunch Break)",
          desc: "កំណត់ម៉ោងបាយថ្ងៃត្រង់ (ឧ. 12:00 - 13:00) ដើម្បីកាត់កងម៉ោងធ្វើការជាក់ស្តែងឱ្យបានត្រឹមត្រូវ 8 ម៉ោងក្នុងមួយថ្ងៃ។",
        },
      ],
      actionLink: "/shifts",
      actionText: "កំណត់វេនការងារ",
    },
    {
      id: "feature-schedules",
      category: "schedules",
      title: "កាលវិភាគប្រចាំសប្តាហ៍ (Weekly Schedules Assignment)",
      subtitle: "Assign shifts to individuals or entire departments across the days of the week",
      badge: "Roster",
      badgeColor: "indigo",
      steps: [
        {
          num: "1",
          title: "ចាត់តាំងកាលវិភាគ (Assign Schedule)",
          desc: "ចូលទៅកាន់ Schedules (/schedules) &rarr; ជ្រើសរើសបុគ្គលិក ឬដេប៉ាតឺម៉ង់ &rarr; ភ្ជាប់វេនការងារទៅកាន់ថ្ងៃច័ន្ទ ដល់ សុក្រ។",
        },
        {
          num: "2",
          title: "កំណត់ថ្ងៃសម្រាក (Days Off)",
          desc: "ថ្ងៃសៅរ៍ និងអាទិត្យ អាចកំណត់ជាថ្ងៃសម្រាក (Day Off) ឬកំណត់វេនកន្លះថ្ងៃសម្រាប់ថ្ងៃសៅរ៍។",
        },
      ],
      actionLink: "/schedules",
      actionText: "ចាត់តាំងកាលវិភាគ",
    },
    {
      id: "feature-leaves",
      category: "schedules",
      title: "ការស្នើសុំ និងអនុម័តច្បាប់ (Leave Requests & Approvals)",
      subtitle: "Annual, sick, maternity, and unpaid leave requests with approval workflow",
      badge: "Leaves",
      badgeColor: "emerald",
      steps: [
        {
          num: "1",
          title: "ស្នើសុំច្បាប់ (Submit Leave)",
          desc: "ចូលទៅកាន់ Leaves (/leaves) &rarr; ចុច '+ Request Leave' &rarr; ជ្រើសរើសបុគ្គលិក ប្រភេទច្បាប់ (ច្បាប់ឈឺ ប្រចាំឆ្នាំ មាតុភាព) និងកាលបរិច្ឆេទ។",
        },
        {
          num: "2",
          title: "ការអនុម័ត (Approval)",
          desc: "អ្នកគ្រប់គ្រងអាចចុច 'Approve' ឬ 'Reject'។ នៅពេល Approve រួចរាល់ ប្រព័ន្ធនឹងចាត់ទុកវត្តមានថ្ងៃនោះជា 'On Leave' ដោយមិនគិតថាអវត្តមានឡើយ។",
        },
      ],
      actionLink: "/leaves",
      actionText: "គ្រប់គ្រងច្បាប់សម្រាក",
    },
    {
      id: "feature-holidays",
      category: "schedules",
      title: "ថ្ងៃឈប់សម្រាកបុណ្យជាតិ (Public Holidays)",
      subtitle: "Calendar of national holidays automatically marked as paid holiday in attendance",
      badge: "Holidays",
      badgeColor: "rose",
      steps: [
        {
          num: "1",
          title: "បន្ថែមថ្ងៃបុណ្យ (Add Holiday)",
          desc: "ចូលទៅកាន់ Holidays (/holidays) &rarr; បន្ថែមថ្ងៃបុណ្យជាតិ (ឧ. ចូលឆ្នាំខ្មែរ ភ្ជុំបិណ្ឌ បុណ្យអុំទូក)។",
        },
        {
          num: "2",
          title: "ការគណនាស្វ័យប្រវត្តិ",
          desc: "នៅថ្ងៃបុណ្យទាំងនោះ ប្រព័ន្ធនឹងកត់សម្គាល់វត្តមានបុគ្គលិកទាំងអស់ជា 'Holiday' ដោយស្វ័យប្រវត្តិ។",
        },
      ],
      actionLink: "/holidays",
      actionText: "គ្រប់គ្រងថ្ងៃបុណ្យ",
    },

    // =========================================================================
    // CATEGORY: REPORTS & EXPORTS
    // =========================================================================
    {
      id: "feature-reports",
      category: "reports",
      title: "របាយការណ៍ និងទាញយកជា Excel / PDF (Reports & Export)",
      subtitle: "Daily summary, monthly timesheets, overtime reports, and branch filters",
      badge: "Exports",
      badgeColor: "sky",
      steps: [
        {
          num: "1",
          title: "ជ្រើសរើសប្រភេទរបាយការណ៍ (Report Type)",
          desc: "ចូលទៅកាន់ Reports (/reports) &rarr; ជ្រើសរើសប្រភេទរបាយការណ៍៖ របាយការណ៍ប្រចាំថ្ងៃ (Daily Attendance), សង្ខេបប្រចាំខែ (Monthly Sheet), ឬរបាយការណ៍ម៉ោងថែម (Overtime)។",
        },
        {
          num: "2",
          title: "ជ្រើសរើសសាខា និងកាលបរិច្ឆេទ (Branch & Date Filter)",
          desc: "ជ្រើសរើសសាខា (Branch) និងចន្លោះកាលបរិច្ឆេទ (ពីថ្ងៃណា ដល់ថ្ងៃណា)។",
        },
        {
          num: "3",
          title: "ចុច Export ជាទម្រង់ដែលចង់បាន",
          desc: "ចុចប៊ូតុង 'Export Excel (.xlsx)', 'Export PDF', ឬ 'Export CSV'។ ឯកសារនឹងទាញយកមកកាន់ម៉ាស៊ីនរបស់អ្នកភ្លាមៗជាមួយទិន្នន័យស្រស់ស្អាត។",
        },
      ],
      actionLink: "/reports",
      actionText: "ទាញយករបាយការណ៍",
    },

    // =========================================================================
    // CATEGORY: DATABASE BACKUPS & CLOUD SYNC
    // =========================================================================
    {
      id: "feature-backups",
      category: "backups",
      title: "ការបម្រុងទុកទិន្នន័យស្វ័យប្រវត្តិ (Database Backups & Cloud Sync)",
      subtitle: "Automated PostgreSQL dumps, retention pruning, and Google Drive upload",
      badge: "Database",
      badgeColor: "indigo",
      steps: [
        {
          num: "1",
          title: "បម្រុងទុកដោយដៃភ្លាមៗ (Manual Backup Now)",
          desc: "ចូលទៅកាន់ Backups (/backups) &rarr; ចុចប៊ូតុង 'បម្រុងទុកឥឡូវនេះ (Backup Now)'។ ប្រព័ន្ធនឹងទាញ Dump PostgreSQL និងបង្ហាប់ជា .sql.gz ក្នុងរយៈពេលប៉ុន្មានវិនាទី។",
        },
        {
          num: "2",
          title: "កំណត់ម៉ោងស្វ័យប្រវត្តិ (Schedule & Retention)",
          desc: "ចូល Tab 'Schedule & Retention' &rarr; បើក Enable &rarr; កំណត់ Daily @ ម៉ោងដែលចង់បាន (ឧ. 02:00 AM ឬ 08:35 AM)។",
        },
        {
          num: "3",
          title: "កំណត់ចំនួនថ្ងៃរក្សាទុក (Auto Pruning)",
          desc: "កំណត់ចំនួនថ្ងៃ (ឧ. 30 ថ្ងៃ)។ ឯកសារចាស់ៗដែលលើសពី 30 ថ្ងៃ នឹងត្រូវបានលុបចេញដោយស្វ័យប្រវត្តិដើម្បីសន្សំទំហំ Disk។",
        },
        {
          num: "4",
          title: "ទាញយកមកកុំព្យូទ័រ (Download Archive)",
          desc: "នៅក្នុង Tab 'Backup Archives' ចុចរូបសញ្ញា Download លើឯកសារណាមួយ ដើម្បីទាញយកទុកលើ Flash Drive ឬកុំព្យូទ័រផ្ទាល់ខ្លួន។",
        },
      ],
      actionLink: "/backups",
      actionText: "គ្រប់គ្រងការបម្រុងទុក",
    },

    // =========================================================================
    // CATEGORY: ADMINISTRATION & SECURITY (USERS, AUDIT, SETTINGS, TENANTS)
    // =========================================================================
    {
      id: "feature-users",
      category: "admin",
      title: "ការគ្រប់គ្រងគណនី និងសិទ្ធិអ្នកប្រើប្រាស់ (User Accounts & Roles)",
      subtitle: "Multi-level RBAC: Super Admin, Admin, HR Manager, Supervisor, and Employee",
      badge: "Security",
      badgeColor: "rose",
      steps: [
        {
          num: "1",
          title: "បង្កើតគណនីចូលប្រព័ន្ធ (Create User)",
          desc: "ចូលទៅកាន់ Users (/users) &rarr; ចុច '+ Add User' &rarr; បញ្ចូល Username, Email, Password, និងជ្រើសរើស Role។",
        },
        {
          num: "2",
          title: "សិទ្ធិតាមតួនាទី (Role Permissions)",
          desc: "SUPER_ADMIN (គ្រប់គ្រងប្រព័ន្ធទាំងអស់), ADMIN (គ្រប់គ្រងក្រុមហ៊ុន), HR_MANAGER (គ្រប់គ្រងបុគ្គលិក និងវត្តមាន), SUPERVISOR (អនុម័តច្បាប់)។",
        },
      ],
      actionLink: "/users",
      actionText: "គ្រប់គ្រងគណនី",
    },
    {
      id: "feature-audit",
      category: "admin",
      title: "ប្រវត្តិសកម្មភាពសុវត្ថិភាព (Audit Trail Logs)",
      subtitle: "Immutable logs tracking administrative modifications, logins, and data exports",
      badge: "Compliance",
      badgeColor: "amber",
      steps: [
        {
          num: "1",
          title: "តាមដានរាល់សកម្មភាព (Track Every Change)",
          desc: "ចូលទៅកាន់ Audit Trail (/audit-logs)។ ប្រព័ន្ធកត់ត្រា៖ អ្នកណាជាអ្នកធ្វើ (Username), ធ្វើសកម្មភាពអ្វី (Action), កាលបរិច្ឆេទ, និង IP Address។",
        },
        {
          num: "2",
          title: "តម្លាភាពក្នុងការកែទិន្នន័យ",
          desc: "រាល់ការកែប្រែម៉ោងវត្តមាន លុបបុគ្គលិក ឬផ្លាស់ប្តូរការកំណត់ សុទ្ធតែត្រូវបានកត់ត្រាទុកយ៉ាងច្បាស់លាស់។",
        },
      ],
      actionLink: "/audit-logs",
      actionText: "មើល Audit Logs",
    },
    {
      id: "feature-settings",
      category: "admin",
      title: "ការកំណត់ទូទៅរបស់ប្រព័ន្ធ (System Settings)",
      subtitle: "Company branding, operational timezone (Asia/Phnom_Penh), and ADMS push port",
      badge: "Settings",
      badgeColor: "indigo",
      steps: [
        {
          num: "1",
          title: "ឈ្មោះស្ថាប័ន និងតំបន់ម៉ោង (General Settings)",
          desc: "កំណត់ឈ្មោះស្ថាប័ន, Logo, ទម្រង់កាលបរិច្ឆេទ (YYYY-MM-DD), និងតំបន់ម៉ោងចម្បង (Asia/Phnom_Penh UTC+7)។",
        },
        {
          num: "2",
          title: "ការកំណត់ Hardware & Daemon",
          desc: "កំណត់ Port សម្រាប់ ADMS Cloud Push (Port 8080) និងចន្លោះពេលទាញទិន្នន័យពីម៉ាស៊ីន (TCP Polling Interval)។",
        },
      ],
      actionLink: "/settings",
      actionText: "ការកំណត់ប្រព័ន្ធ",
    },
    {
      id: "feature-import",
      category: "admin",
      title: "ការនាំចូលទិន្នន័យជាដុំ (Bulk Data Import)",
      subtitle: "Import hundreds of employees or past attendance records using Excel/CSV templates",
      badge: "Import",
      badgeColor: "emerald",
      steps: [
        {
          num: "1",
          title: "ទាញយកគំរូឯកសារ (Download Template)",
          desc: "ចូលទៅកាន់ Data Import (/data-import) &rarr; ចុច 'Download Excel Template'។",
        },
        {
          num: "2",
          title: "បំពេញទិន្នន័យ និង Upload",
          desc: "បំពេញឈ្មោះបុគ្គលិក លេខកូដ សាខា ដេប៉ាតឺម៉ង់ ក្នុង Excel រួចទម្លាក់ Upload ចូលប្រព័ន្ធ។ ប្រព័ន្ធនឹងបង្កើតបុគ្គលិករាប់រយនាក់ក្នុងពេលតែមួយ។",
        },
      ],
      actionLink: "/data-import",
      actionText: "នាំចូលទិន្នន័យ",
    },
  ];

  // Filter cards by category and search
  const filteredCards = guideCards.filter((card) => {
    const matchesCategory = activeCategory === "all" || card.category === activeCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      card.title.toLowerCase().includes(q) ||
      card.subtitle.toLowerCase().includes(q) ||
      card.steps.some((s) => s.title.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Hero Header */}
      <div className="rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-sky-900 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-indigo-700/50">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-white/10 to-transparent pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-indigo-200 border border-white/20 text-xs font-bold backdrop-blur-xs">
            <Sparkles size={14} className="text-amber-300" />
            <span>មជ្ឈមណ្ឌលជំនួយ និងសៀវភៅណែនាំរូបភាពគ្រប់មុខងារ (Comprehensive Visual Guide)</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            សៀវភៅណែនាំរបៀបប្រើប្រាស់គ្រប់មុខងារ (All Features Guide)
          </h1>
          <p className="text-xs sm:text-sm text-indigo-200/90 max-w-3xl leading-relaxed">
            ស្វែងយល់លម្អិតអំពីរបៀបប្រើប្រាស់គ្រប់មុខងារក្នុងប្រព័ន្ធ៖ វត្តមានផ្ទាល់, ម៉ាស៊ីនស្កេន ZKTeco, កាមេរ៉ាស្កេនមុខ AI Kiosk, វេនការងារ, របាយការណ៍ Excel/PDF, ការបម្រុងទុក Database និងដំណោះស្រាយ Google Drive Bypass។
          </p>

          {/* Search Box */}
          <div className="pt-2 max-w-xl">
            <div className="relative">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ស្វែងរកមុខងារ (e.g. Google, ZKTeco, Kiosk, Shift, Backup, Excel, Leave)..."
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white placeholder-slate-400 text-xs font-medium outline-none shadow-lg focus:ring-4 focus:ring-indigo-400/30 border border-white/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shadow-2xs ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25 scale-102"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <Icon size={15} />
              <span>{cat.label}</span>
              {cat.badge && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase bg-rose-500 text-white">
                  {cat.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Count Indicator */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <span>
          បង្ហាញ <strong>{filteredCards.length}</strong> មុខងារនៃការណែនាំ
        </span>
        {searchQuery && (
          <span>
            លទ្ធផលស្វែងរកសម្រាប់: <strong className="text-indigo-600 dark:text-indigo-400">&ldquo;{searchQuery}&rdquo;</strong>
          </span>
        )}
      </div>

      {/* Guide Cards Grid */}
      <div className="space-y-6">
        {filteredCards.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-8">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Search size={26} />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">មិនមានលទ្ធផលស្វែងរកទេ</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              គ្មានការណែនាំដែលត្រូវនឹង &ldquo;{searchQuery}&rdquo; ឡើយ។ សូមសាកល្បងពាក្យគន្លឹះផ្សេង។
            </p>
          </div>
        ) : (
          filteredCards.map((card) => (
            <div
              key={card.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden transition-all hover:border-indigo-500/40"
            >
              {/* Card Header */}
              <div className="p-5 sm:p-6 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/30">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        card.badgeColor === "rose"
                          ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                          : card.badgeColor === "emerald"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : card.badgeColor === "sky"
                          ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                          : card.badgeColor === "amber"
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          : "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
                      }`}
                    >
                      {card.badge}
                    </span>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      {card.title}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {card.subtitle}
                  </p>
                </div>

                {card.actionLink && (
                  <Link
                    href={card.actionLink}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs self-start sm:self-auto shrink-0 transition-all active:scale-95"
                  >
                    <span>{card.actionText}</span>
                    <ArrowRight size={14} />
                  </Link>
                )}
              </div>

              {/* Steps Body */}
              <div className="p-5 sm:p-6 space-y-4">
                {card.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                          {step.num}
                        </span>
                        <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                          {step.title}
                        </h3>
                      </div>

                      {step.link && (
                        <a
                          href={step.link}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 font-bold text-[11px] flex items-center gap-1 shrink-0 border border-indigo-200/60 dark:border-indigo-800/60"
                        >
                          <span>{step.linkText || "Open Link"}</span>
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-9.5">
                      {step.desc}
                    </p>

                    {/* Optional diagram/visual code */}
                    {step.diagram && (
                      <div className="pl-9.5 pt-1">
                        {step.diagram}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Support Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div>
          <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
            ប្រព័ន្ធគ្រប់គ្រងវត្តមាន ZKTeco Biometrics & Backups
          </h4>
          <p className="text-slate-500 dark:text-slate-400 mt-0.5">
            រៀបចំឡើងយ៉ាងពេញលេញសម្រាប់ Enterprise Multi-Branch, Biometric Hardware, Attendance AI, និង Cloud Automation។
          </p>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 self-start sm:self-auto shadow-2xs"
        >
          ត្រឡប់ទៅផ្ទាំង Dashboard &rarr;
        </Link>
      </div>
    </div>
  );
}
