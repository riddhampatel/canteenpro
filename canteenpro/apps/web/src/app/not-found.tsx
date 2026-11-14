import Link from "next/link";
export default function NotFound() {
  return (
    <div className="wrap py-28 text-center">
      <h1 className="text-5xl font-extrabold">This plate is empty</h1>
      <p className="mt-4 text-lg text-navy-600">
        The page you were looking for doesn’t exist or has moved.
      </p>
      <Link href="/" className="btn-navy mt-8">
        Go to the home page
      </Link>
    </div>
  );
}
