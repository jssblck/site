import { JOBS, LINKS, PROJECTS, TALKS, WRITING } from "./content"
import type { Item } from "./content"

function ItemList({ items, label }: { items: Item[]; label: string }) {
  return (
    <ul className="items" aria-label={label}>
      {items.map((it) => (
        <li key={it.url}>
          <a href={it.url}>{it.title}</a>
          <span className="muted">{it.where}</span>
        </li>
      ))}
    </ul>
  )
}

export default function Page() {
  return (
    <main>
      <header>
        <h1>Jessica Black</h1>
        <p className="lede">
          Founding engineer at Attune. I build AI agent systems in Rust and
          TypeScript. Before that, 13 years in distributed systems, program
          analysis, and developer tools, most recently as a tech lead at FOSSA.
        </p>
        <ItemList items={LINKS} label="contact" />
      </header>

      <section aria-labelledby="work">
        <h2 id="work">Work</h2>
        {JOBS.map((j) => (
          <article key={j.org} className="job">
            <h3>
              {j.org} <span className="muted">{j.role}</span>
            </h3>
            <p className="muted dates">{j.dates}</p>
            <ul>
              {j.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section aria-labelledby="projects">
        <h2 id="projects">Projects</h2>
        <ul className="items projects">
          {PROJECTS.map((p) => (
            <li key={p.name}>
              <a href={p.url}>{p.name}</a>
              <span className="muted">{p.lang}</span>
              <span className="note">{p.note}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="writing">
        <h2 id="writing">Writing</h2>
        <ItemList items={WRITING} label="writing" />
      </section>

      <section aria-labelledby="talks">
        <h2 id="talks">Talks</h2>
        <ItemList items={TALKS} label="talks" />
      </section>
    </main>
  )
}
