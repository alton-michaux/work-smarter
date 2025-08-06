import Link from "next/link";

export default function ActionItems () {
  return(    
      <section className="flex space-x-8 justify-center">
        <Link href="/register" legacyBehavior>
          <a className="inline-block text-gray-700 hover:text-blue-600">Sign Up</a>
        </Link>
        <Link href="/about" legacyBehavior>
          <a className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Learn More</a>
        </Link>
      </section>
  )
}