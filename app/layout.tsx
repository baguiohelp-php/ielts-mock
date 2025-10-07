export const metadata = {
  title: "IELTS Mock",
  description: "IELTS mock test embed"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
