import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-gray-600">The page you are looking for does not exist.</p>
        <Link to="/" className="mt-6 inline-block font-medium text-brand-700">
          Go home
        </Link>
      </div>
    </div>
  );
}
