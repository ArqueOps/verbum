import ResetPasswordForm from "./reset-password-form";

export const metadata = {
  title: "Redefinir Senha — Verbum",
};

export default function ResetPasswordPage() {
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
            Redefinir Senha
          </h2>
          <p className="mt-1 text-center text-sm text-foreground/60">
            Escolha uma nova senha para sua conta
          </p>
        </div>

        <ResetPasswordForm />
      </div>
    </main>
  );
}
