import ForgotPasswordForm from "./forgot-password-form";

export const metadata = {
  title: "Recuperar Senha — Verbum",
};

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="font-serif text-3xl font-bold tracking-tight text-primary">
            Verbum
          </h1>
          <p className="mt-2 text-foreground/60">
            Profundidade que ilumina
          </p>
        </div>

        <div>
          <h2 className="text-center text-xl font-semibold text-foreground">
            Recuperar Senha
          </h2>
          <p className="mt-1 text-center text-sm text-foreground/60">
            Informe seu e-mail para receber o link de recuperação
          </p>
        </div>

        <ForgotPasswordForm />
      </div>
    </main>
  );
}
