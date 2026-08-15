import { Link } from 'react-router-dom'
import { useLocale, useT } from '@/i18n'
import { Button } from '@/components/ui'
import { CONTACT_EMAIL } from './legal-content'
import './legal.css'

/**
 * Public, logged-out deletion instructions. Store policies and parents both expect a
 * page reachable without an account that explains exactly how data gets erased.
 */
export function DeleteAccountRequestPage() {
  const t = useT()
  const { locale } = useLocale()
  const hebrew = locale === 'he'

  return (
    <main className="legal" id="main">
      <div className="legal__inner">
        <Link to="/" className="legal__back">
          {t.legal.backHome}
        </Link>
        <h1>{t.legal.deleteRequestTitle}</h1>

        {hebrew ? (
          <>
            <section>
              <h2>מחיקה מתוך האפליקציה</h2>
              <p>
                הדרך המהירה ביותר: היכנסו לחשבון, פתחו את אזור ההורים ובחרו הגדרות → מחיקת חשבון
                המשפחה. המחיקה מיידית ומוחקת לצמיתות את כל נתוני המשפחה: פרופילי הילדים, המשימות,
                השגרות, הפרסים, סימוני הביצוע ורשומות היומן, וכן את כל חשבונות ההורים והילדים המקושרים.
              </p>
            </section>
            <section>
              <h2>מחיקת פרופיל ילד בלבד</h2>
              <p>הגדרות → ילדים → מחיקה. פעולה זו מוחקת את כל הנתונים של אותו ילד בלבד.</p>
            </section>
            <section>
              <h2>אם אינכם יכולים להיכנס</h2>
              <p>
                שלחו מייל אל {CONTACT_EMAIL} מכתובת האימייל של החשבון וכתבו "בקשת מחיקת חשבון". נטפל
                בבקשה תוך 30 יום ונאשר לכם במייל.
              </p>
            </section>
            <section>
              <h2>ייצוא לפני מחיקה</h2>
              <p>
                לפני המחיקה ניתן לייצא את כל נתוני המשפחה לקובץ JSON: הגדרות → ייצוא נתוני המשפחה.
              </p>
            </section>
          </>
        ) : (
          <>
            <section>
              <h2>Delete from inside the app</h2>
              <p>
                The fastest route: sign in, open the parent area and choose Settings → Delete family
                account. It happens immediately and permanently erases all family data — child
                profiles, tasks, routines, rewards, completions and journal entries — along with
                every linked parent and child account in the family.
              </p>
            </section>
            <section>
              <h2>Delete a single child profile</h2>
              <p>Settings → Children → Delete. This erases only that child’s data.</p>
            </section>
            <section>
              <h2>If you cannot sign in</h2>
              <p>
                Email {CONTACT_EMAIL} from the account’s email address with the subject "Account
                deletion request". We will action it within 30 days and confirm by email.
              </p>
            </section>
            <section>
              <h2>Export first</h2>
              <p>
                You can export all family data as a JSON file before deleting: Settings → Export
                family data.
              </p>
            </section>
          </>
        )}

        <Link to="/privacy">
          <Button variant="secondary">{t.settings.privacyPolicy}</Button>
        </Link>
      </div>
    </main>
  )
}

// Default export so the router can code-split this page into its own chunk.
export default DeleteAccountRequestPage
