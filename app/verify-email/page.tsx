// app/verify-email/page.tsx
// Day 10: Email Verification Required Page

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 max-w-md w-full">
        <div className="text-center">
          <div className="text-6xl mb-6">📧</div>
          <h1 className="text-2xl font-bold text-white mb-4">
            Potwierdź swój adres email
          </h1>
          <p className="text-slate-300 mb-4">
            Wysłaliśmy link aktywacyjny na Twój adres email.
          </p>
          <div className="bg-slate-700/50 p-4 rounded-lg mb-6">
            <p className="text-sm text-slate-300">
              Aby kontynuować, musisz potwierdzić swój adres email klikając w link aktywacyjny.
            </p>
          </div>
          <p className="text-slate-400 text-sm mb-6">
            Nie widzisz emaila?
          </p>
          <ul className="text-sm text-slate-400 text-left space-y-2 mb-6">
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Sprawdź folder SPAM lub Wiadomości niechciane</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Poczekaj kilka minut - email może dotrzeć z opóźnieniem</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Skontaktuj się z administratorem jeśli problem się powtarza</span>
            </li>
          </ul>
          <a
            href="/login"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Powrót do logowania
          </a>
        </div>
      </div>
    </div>
  );
}
