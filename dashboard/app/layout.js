import './globals.css';

export const metadata = {
  title: 'ConflictRadar',
  description: 'Real-time code overlap detection for collaborative dev teams',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
