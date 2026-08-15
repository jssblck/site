import Link from "next/link"

export default function NotFound() {
  return (
    <main>
      <h1>404</h1>
      <p className="lede">Nothing lives at this address.</p>
      <p>
        <Link href="/">Back to the front page</Link>
      </p>
    </main>
  )
}
