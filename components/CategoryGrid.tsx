import Link from "next/link";
import { categories } from "@/lib/site";
export function CategoryGrid(){return <div className="category-board"><div className="category-head"><span>Category</span><span>Intended coverage</span><span>Status</span></div>{categories.map((c,i)=><Link className="category-row" href={`/categories/${c.slug}`} key={c.slug}><span className="category-index">0{i+1}</span><strong>{c.shortName}</strong><span>{c.summary}</span><em data-status={c.status==="Planned"?"planned":"research"}>{c.status}</em><span>↗</span></Link>)}</div>}
