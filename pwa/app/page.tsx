import Link from 'next/link';

export default function Home() {
  return (
    <div
      className="content-wrapper d-flex align-items-center justify-content-center"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url("/assets/dist/img/photo1.png") no-repeat center center', // Fallback/Placeholder
        backgroundSize: 'cover',
        marginLeft: 0,
        color: 'white',
        textAlign: 'center',
      }}
    >
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="mb-4">
              <img src="/assets/dist/img/logo.png" alt="Samsara Forge" style={{ height: 500, width: 'auto' }} />
            </div>

            <h2 className="mb-3" style={{ fontSize: '2.5rem', fontWeight: 300 }}>
              Exit the loop. Forge the path.
            </h2>

            <p className="lead mb-5" style={{ fontSize: '1.25rem', opacity: 0.9 }}>
              A mindful self-mastery system for breaking cycles and building habits that last
            </p>

            <Link href="/auth/register" className="btn btn-lg" style={{
              backgroundColor: '#b8860b',
              borderColor: '#b8860b',
              color: 'white',
              padding: '12px 30px',
              borderRadius: '5px',
              fontSize: '1.2rem',
              boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
            }}>
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
