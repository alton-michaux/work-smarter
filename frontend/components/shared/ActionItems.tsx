import Link from "next/link";

export default function ActionItems () {
  return(    
      <section className="flex space-x-8 justify-center py-4">
        <Link href="/register" legacyBehavior>
          <a className="bg-green-600 text-white px-6 py-3 rounded shadow hover:bg-green-700 transition">Sign Up</a>
        </Link>
        <Link href="/about" legacyBehavior>
          <a className="text-green-600 hover:underline px-6 py-3">Learn More</a>
        </Link>
      </section>
  )
}