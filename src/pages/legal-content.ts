/**
 * Legal copy lives in code so the published policy always matches the shipped build.
 * Keep it truthful: every claim here is checked against what the app actually stores.
 */

export const LAST_UPDATED = '2026-08-01'
export const CONTACT_EMAIL = 'privacy@kidtasks.app'
export const DEVELOPER_NAME = 'KidTasks'

type Section = { heading: string; body: string[] }

export const PRIVACY_HE: Section[] = [
  {
    heading: 'מי אנחנו',
    body: [
      `האפליקציה "המשימות שלי" (KidTasks) מפותחת על ידי ${DEVELOPER_NAME}. לשאלות בנושא פרטיות: ${CONTACT_EMAIL}.`,
    ],
  },
  {
    heading: 'איזה מידע נאסף',
    body: [
      'חשבון ההורה: כתובת אימייל וסיסמה מוצפנת (מנוהלות על ידי Supabase Auth), ושם תצוגה שאתם מזינים.',
      'התחברות ילד/ה (לא חובה): אם הורה מפעיל אפשרות זו, נשמרים כתובת האימייל של הילד/ה וסיסמה מוצפנת המנוהלת על ידי Supabase Auth.',
      'פרטי המשפחה: שם המשפחה, אזור זמן, שעות תזכורת והעדפות התראה.',
      'פרופילי ילדים: שם פרטי בלבד (כפי שאתם בוחרים להקליד), אימוג׳י וצבע. איננו אוספים תאריך לידה, תמונות, מיקום, אנשי קשר, מיקרופון או מצלמה.',
      'תוכן שאתם יוצרים: משימות, שגרות, רשימות שלבים, פרסים, סימוני ביצוע ורשומות יומן (מצב רוח וטקסט חופשי).',
      'התראות: אם הפעלתם התראות, נשמר מזהה ההרשמה של הדפדפן שלכם וסוג הדפדפן.',
    ],
  },
  {
    heading: 'למה המידע נאסף',
    body: [
      'המידע משמש אך ורק להפעלת האפליקציה: הצגת המשימות, שמירת ההתקדמות, חישוב כוכבים ופרסים, סנכרון בין מכשירי המשפחה ושליחת התזכורות שביקשתם.',
      'איננו משתמשים במידע לפרסום, אין באפליקציה פרסומות, אין Advertising ID ואין כלי מעקב או אנליטיקה של צד שלישי.',
    ],
  },
  {
    heading: 'היכן המידע נשמר',
    body: [
      'המידע נשמר בשירות Supabase (מסד נתונים PostgreSQL) בשרתים באיחוד האירופי. ההעברה מוצפנת ב-HTTPS/TLS.',
      'הגישה מוגבלת ברמת מסד הנתונים: חשבון הורה רואה את נתוני המשפחה שלו, וחשבון ילד/ה רואה רק את הפרופיל והנתונים של אותו ילד/ה.',
      'עותק מקומי של הנתונים נשמר בדפדפן שלכם כדי לאפשר עבודה גם ללא חיבור לאינטרנט.',
    ],
  },
  {
    heading: 'שירותי צד שלישי',
    body: [
      'Supabase — אחסון נתונים, הזדהות ופונקציות שרת.',
      'שירות ההתראות של הדפדפן שלכם (למשל Google או Apple) — מעביר את ההתראות למכשיר. תוכן ההתראה עובר דרכו מוצפן.',
      'שירות האחסון שממנו האתר מוגש. איננו מוכרים, משכירים או משתפים מידע עם גורמים אחרים.',
    ],
  },
  {
    heading: 'הגנה על מידע של ילדים',
    body: [
      'הורה יכול ליצור התחברות אופציונלית לילד/ה, לעדכן אותה או לבטל אותה. היא מאפשרת גישה רק לנתוני אותו ילד/ה.',
      'אין באפליקציה צ׳אט, חיפוש משתמשים, פרופילים ציבוריים או כל דרך ליצור קשר עם אנשים מחוץ למשפחה.',
      'ניתן להגדיר שהתראות יציגו טקסט כללי בלבד, בלי שמות ילדים, כך שלא יופיע מידע אישי במסך נעול.',
      'אנו אוספים את המידע המינימלי הנדרש להפעלת האפליקציה.',
    ],
  },
  {
    heading: 'כמה זמן המידע נשמר',
    body: [
      'המידע נשמר כל עוד חשבון המשפחה קיים. מחיקת פרופיל ילד מוחקת מיד את כל המשימות, הביצועים והיומן שלו.',
      'מחיקת חשבון המשפחה מוחקת לצמיתות את כל נתוני המשפחה ואת חשבונות ההורים והילדים המקושרים — זו מחיקה אמיתית, לא השבתה.',
    ],
  },
  {
    heading: 'איך מוחקים מידע',
    body: [
      'באפליקציה: הגדרות → מחיקת חשבון המשפחה. המחיקה מיידית ואינה הפיכה.',
      'למחיקת פרופיל ילד בלבד: הגדרות → ילדים → מחיקה.',
      `אם אינכם יכולים להיכנס לחשבון, שלחו בקשה לכתובת ${CONTACT_EMAIL} מכתובת האימייל של החשבון.`,
      'ניתן גם לייצא את כל נתוני המשפחה כקובץ JSON לפני המחיקה.',
    ],
  },
  {
    heading: 'שינויים במדיניות',
    body: ['אם נעדכן את המדיניות, נעדכן את תאריך העדכון בראש העמוד.'],
  },
]

export const PRIVACY_EN: Section[] = [
  {
    heading: 'Who we are',
    body: [
      `KidTasks ("המשימות שלי") is developed by ${DEVELOPER_NAME}. For privacy questions: ${CONTACT_EMAIL}.`,
    ],
  },
  {
    heading: 'What we collect',
    body: [
      'Parent account: email address and a hashed password (handled by Supabase Auth), plus the display name you enter.',
      "Optional child login: when a parent enables it, we store the child's email address and a hashed password handled by Supabase Auth.",
      'Family details: family name, time zone, reminder times and notification preferences.',
      'Child profiles: a first name only (whatever you choose to type), an emoji and a colour. We do not collect birth dates, photos, location, contacts, microphone or camera.',
      'Content you create: tasks, routines, checklists, rewards, completion marks and journal entries (a mood and free text).',
      'Notifications: if you turn them on, we store your browser push endpoint and browser type.',
    ],
  },
  {
    heading: 'Why we collect it',
    body: [
      'Solely to run the app: showing tasks, saving progress, calculating stars and rewards, syncing across your family devices and sending the reminders you asked for.',
      'We do not use it for advertising. There are no ads, no advertising ID and no third-party analytics or tracking.',
    ],
  },
  {
    heading: 'Where it is stored',
    body: [
      'In Supabase (a PostgreSQL database) on servers in the European Union. All transfer is encrypted with HTTPS/TLS.',
      'Database-level access rules let a parent account read its family data and restrict a child account to that child’s own profile and data.',
      'A local copy is cached in your browser so the app keeps working offline.',
    ],
  },
  {
    heading: 'Third parties',
    body: [
      'Supabase — data storage, authentication and server functions.',
      "Your browser's push service (for example Google or Apple) — delivers notifications to the device.",
      'The static host that serves the website. We do not sell, rent or share data with anyone else.',
    ],
  },
  {
    heading: 'Protecting children',
    body: [
      'A parent can optionally create, update or revoke a child login. It can access only that child’s own data.',
      'There is no chat, no user search, no public profile and no way to contact anyone outside the family.',
      'You can set notifications to show generic text without children’s names, so nothing personal appears on a lock screen.',
      'We collect the minimum data needed to run the app.',
    ],
  },
  {
    heading: 'How long we keep it',
    body: [
      'For as long as the family account exists. Deleting a child profile immediately erases their tasks, completions and journal.',
      'Deleting the family account permanently erases all family data and all linked parent and child accounts — a real deletion, not a deactivation.',
    ],
  },
  {
    heading: 'How to delete your data',
    body: [
      'In the app: Settings → Delete family account. It is immediate and irreversible.',
      'To delete only one child: Settings → Children → Delete.',
      `If you cannot sign in, email ${CONTACT_EMAIL} from the account's email address.`,
      'You can also export all family data as a JSON file before deleting.',
    ],
  },
  {
    heading: 'Changes',
    body: ['If we update this policy we will update the date at the top of this page.'],
  },
]

export const TERMS_HE: Section[] = [
  {
    heading: 'השירות',
    body: [
      '"המשימות שלי" היא אפליקציה לניהול משימות יומיות של ילדים בתוך המשפחה. השימוש בה מיועד להורים ולילדיהם בלבד.',
    ],
  },
  {
    heading: 'החשבון',
    body: [
      'חשבון נפתח על ידי הורה או אפוטרופוס בלבד. אתם אחראים לשמור על סודיות הסיסמה.',
      'קוד ההורים באפליקציה נועד למנוע כניסה מקרית של ילדים לאזור ההורים ואינו אמצעי אבטחה.',
    ],
  },
  {
    heading: 'שימוש הוגן',
    body: [
      'אין להשתמש בשירות למטרות בלתי חוקיות, ואין להעלות תוכן פוגעני.',
      'אין להזין מידע רגיש שאינו נדרש לתפעול המשימות.',
    ],
  },
  {
    heading: 'זמינות ואחריות',
    body: [
      'השירות ניתן כמות שהוא (AS IS) ללא התחייבות לזמינות רציפה.',
      'איננו אחראים לנזק עקיף הנובע משימוש בשירות. מומלץ לייצא גיבוי של הנתונים מדי פעם.',
    ],
  },
  {
    heading: 'סיום השימוש',
    body: ['ניתן למחוק את החשבון בכל עת מתוך מסך ההגדרות. המחיקה מוחקת את כל הנתונים לצמיתות.'],
  },
]

export const TERMS_EN: Section[] = [
  {
    heading: 'The service',
    body: [
      'KidTasks helps families manage children’s daily tasks. It is intended for parents and their own children only.',
    ],
  },
  {
    heading: 'Your account',
    body: [
      'Accounts may only be created by a parent or guardian. You are responsible for keeping your password secret.',
      'The in-app parent code prevents accidental access by children; it is not a security measure.',
    ],
  },
  {
    heading: 'Acceptable use',
    body: [
      'Do not use the service for unlawful purposes or upload abusive content.',
      'Do not enter sensitive information that is not needed to run the tasks.',
    ],
  },
  {
    heading: 'Availability and liability',
    body: [
      'The service is provided AS IS with no guarantee of uninterrupted availability.',
      'We are not liable for indirect damages arising from use of the service. Export a backup from time to time.',
    ],
  },
  {
    heading: 'Ending use',
    body: ['You can delete your account at any time from Settings. Deletion erases all data permanently.'],
  },
]
