import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Samsara Forge',
  description: 'Exit the loop. Forge the path.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Google Font: Source Sans Pro */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css?family=Source+Sans+Pro:300,400,400i,700&display=fallback"
        />
        {/* Font Awesome */}
        <link rel="stylesheet" href="/assets/plugins/fontawesome-free/css/all.min.css" />
        {/* Theme style */}
        <link rel="stylesheet" href="/assets/dist/css/adminlte.min.css" />
      </head>
      <body className="hold-transition layout-top-nav">
        <div className="wrapper">
          {children}
        </div>
        {/* jQuery */}
        <script src="/assets/plugins/jquery/jquery.min.js" defer></script>
        {/* Bootstrap 4 */}
        <script src="/assets/plugins/bootstrap/js/bootstrap.bundle.min.js" defer></script>
        {/* AdminLTE App */}
        <script src="/assets/dist/js/adminlte.min.js" defer></script>
      </body>
    </html>
  );
}
