"use client"

import { useState, useEffect } from "react"
import { Github, Mail, Linkedin, Terminal, Code2, Sparkles, ChevronRight, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BackgroundAnimation } from "@/components/background-animation"

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-black text-zinc-100 relative overflow-hidden">
      {/* Animated Background */}
      <BackgroundAnimation />

      {/* Header/Navigation */}
      <header className="fixed top-0 w-full z-50 backdrop-blur-md bg-black/70 border-b border-zinc-800">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-lavender-500 flex items-center justify-center text-white font-bold">
              JD
            </div>
            <span className="font-semibold tracking-tight">Jane Doe</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#about" className="text-sm text-zinc-400 hover:text-white transition-colors">
              About
            </a>
            <a href="#skills" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Skills
            </a>
            <a href="#experience" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Experience
            </a>
            <a href="#projects" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Projects
            </a>
            <a href="#contact" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Contact
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <Github className="h-5 w-5" />
              <span className="sr-only">GitHub</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <Linkedin className="h-5 w-5" />
              <span className="sr-only">LinkedIn</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-lavender-900/10 to-transparent opacity-30"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-lavender-500/10 rounded-full blur-3xl"></div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            <div className="inline-block mb-4 px-4 py-1 rounded-full bg-zinc-800/80 border border-zinc-700 text-lavender-300 text-sm font-medium">
              Staff Software Engineer
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
              Jane <span className="text-lavender-400">Doe</span>
            </h1>
            <p className="text-xl md:text-2xl text-zinc-400 mb-8 leading-relaxed">
              Building robust systems with <span className="text-lavender-300 font-medium">Rust</span> and exploring the
              elegance of functional programming with <span className="text-lavender-300 font-medium">Haskell</span>,{" "}
              <span className="text-lavender-300 font-medium">Go</span>, and{" "}
              <span className="text-lavender-300 font-medium">TypeScript</span>.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button className="rounded-full bg-lavender-500 hover:bg-lavender-600 text-white">
                View Projects
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" className="rounded-full border-zinc-700 hover:bg-zinc-800 text-zinc-300">
                Contact Me
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 relative z-10">
        <Tabs defaultValue="about" className="w-full" id="main-tabs">
          <div className="flex justify-center mb-8">
            <TabsList className="grid grid-cols-4 bg-zinc-900/50 border border-zinc-800 rounded-full p-1">
              <TabsTrigger
                value="about"
                className="rounded-full data-[state=active]:bg-lavender-500 data-[state=active]:text-white px-6"
                onClick={() => document.getElementById("about")?.scrollIntoView()}
              >
                About
              </TabsTrigger>
              <TabsTrigger
                value="skills"
                className="rounded-full data-[state=active]:bg-lavender-500 data-[state=active]:text-white px-6"
                onClick={() => document.getElementById("skills")?.scrollIntoView()}
              >
                Skills
              </TabsTrigger>
              <TabsTrigger
                value="experience"
                className="rounded-full data-[state=active]:bg-lavender-500 data-[state=active]:text-white px-6"
                onClick={() => document.getElementById("experience")?.scrollIntoView()}
              >
                Experience
              </TabsTrigger>
              <TabsTrigger
                value="projects"
                className="rounded-full data-[state=active]:bg-lavender-500 data-[state=active]:text-white px-6"
                onClick={() => document.getElementById("projects")?.scrollIntoView()}
              >
                Projects
              </TabsTrigger>
            </TabsList>
          </div>

          {/* About Section */}
          <TabsContent value="about" className="mt-6" id="about">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="w-full md:w-1/3">
                <div className="sticky top-24">
                  <div className="relative w-full aspect-square md:aspect-[3/4] overflow-hidden rounded-2xl border border-zinc-800 mb-6">
                    <img
                      src="/placeholder.svg?height=600&width=400"
                      alt="Jane Doe"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                  </div>
                  <div className="flex justify-center gap-4">
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full border-zinc-700 hover:bg-zinc-800 text-zinc-300"
                    >
                      <Github className="h-5 w-5" />
                      <span className="sr-only">GitHub</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full border-zinc-700 hover:bg-zinc-800 text-zinc-300"
                    >
                      <Linkedin className="h-5 w-5" />
                      <span className="sr-only">LinkedIn</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full border-zinc-700 hover:bg-zinc-800 text-zinc-300"
                    >
                      <Mail className="h-5 w-5" />
                      <span className="sr-only">Email</span>
                    </Button>
                  </div>
                </div>
              </div>
              <div className="w-full md:w-2/3">
                <h2 className="text-3xl font-bold mb-6 flex items-center">
                  <span className="bg-lavender-500 w-6 h-1 rounded-full mr-3"></span>
                  About Me
                </h2>
                <div className="prose prose-invert max-w-none">
                  <p className="text-lg leading-relaxed mb-6 text-zinc-300">
                    Hello! I'm a Staff Software Engineer with a passion for systems programming and elegant code. With
                    over 8 years of experience building high-performance applications, I specialize in Rust development
                    while maintaining proficiency in Go, Haskell, and TypeScript.
                  </p>
                  <p className="text-lg leading-relaxed mb-6 text-zinc-300">
                    My journey in software engineering began with a fascination for how computers work at the lowest
                    levels. This curiosity led me to systems programming, where I found my niche in building reliable,
                    efficient, and maintainable software.
                  </p>
                  <p className="text-lg leading-relaxed mb-6 text-zinc-300">
                    When I'm not coding, you might find me exploring functional programming concepts, contributing to
                    open-source projects, or mentoring junior developers. I also enjoy hiking, playing chess, and
                    experimenting with mechanical keyboards.
                  </p>
                  <div className="grid grid-cols-2 gap-6 mt-10">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                      <h3 className="text-xl font-bold mb-2">Education</h3>
                      <p className="text-zinc-400">MSc Computer Science</p>
                      <p className="text-zinc-500">Stanford University, 2015</p>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                      <h3 className="text-xl font-bold mb-2">Location</h3>
                      <p className="text-zinc-400">San Francisco, CA</p>
                      <p className="text-zinc-500">Available for remote work</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Skills Section */}
          <TabsContent value="skills" className="mt-6" id="skills">
            <h2 className="text-3xl font-bold mb-10 flex items-center">
              <span className="bg-lavender-500 w-6 h-1 rounded-full mr-3"></span>
              Skills & Expertise
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-lavender-400 to-periwinkle-400"></div>
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-6 flex items-center">
                    <Terminal className="mr-2 h-5 w-5 text-lavender-300" />
                    Programming Languages
                  </h3>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="font-medium flex items-center">
                          <span className="inline-block w-3 h-3 bg-lavender-400 rounded-full mr-2"></span>
                          Rust
                        </span>
                        <span className="text-lavender-300">Expert</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-lavender-400 to-periwinkle-400 h-2 rounded-full"
                          style={{ width: "95%" }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="font-medium flex items-center">
                          <span className="inline-block w-3 h-3 bg-periwinkle-400 rounded-full mr-2"></span>
                          Go
                        </span>
                        <span className="text-periwinkle-300">Advanced</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-periwinkle-400 to-lilac-400 h-2 rounded-full"
                          style={{ width: "85%" }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="font-medium flex items-center">
                          <span className="inline-block w-3 h-3 bg-lilac-400 rounded-full mr-2"></span>
                          Haskell
                        </span>
                        <span className="text-lilac-300">Advanced</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-lilac-400 to-mauve-400 h-2 rounded-full"
                          style={{ width: "80%" }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="font-medium flex items-center">
                          <span className="inline-block w-3 h-3 bg-sky-400 rounded-full mr-2"></span>
                          TypeScript
                        </span>
                        <span className="text-sky-300">Advanced</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-sky-400 to-teal-400 h-2 rounded-full"
                          style={{ width: "85%" }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="font-medium flex items-center">
                          <span className="inline-block w-3 h-3 bg-teal-400 rounded-full mr-2"></span>
                          C++
                        </span>
                        <span className="text-teal-300">Proficient</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-teal-400 to-mint-400 h-2 rounded-full"
                          style={{ width: "75%" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-sky-400 to-teal-400"></div>
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-6 flex items-center">
                    <Code2 className="mr-2 h-5 w-5 text-sky-300" />
                    Technologies & Frameworks
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700 hover:border-sky-400/50 transition-colors group">
                      <h4 className="font-medium mb-2 group-hover:text-sky-300 transition-colors">
                        Distributed Systems
                      </h4>
                      <p className="text-sm text-zinc-400">
                        Design and implementation of scalable, fault-tolerant systems
                      </p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700 hover:border-teal-400/50 transition-colors group">
                      <h4 className="font-medium mb-2 group-hover:text-teal-300 transition-colors">WebAssembly</h4>
                      <p className="text-sm text-zinc-400">Building high-performance web applications with WASM</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700 hover:border-lavender-400/50 transition-colors group">
                      <h4 className="font-medium mb-2 group-hover:text-lavender-300 transition-colors">Kubernetes</h4>
                      <p className="text-sm text-zinc-400">Container orchestration and deployment automation</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700 hover:border-periwinkle-400/50 transition-colors group">
                      <h4 className="font-medium mb-2 group-hover:text-periwinkle-300 transition-colors">gRPC</h4>
                      <p className="text-sm text-zinc-400">High-performance RPC framework for microservices</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700 hover:border-lilac-400/50 transition-colors group">
                      <h4 className="font-medium mb-2 group-hover:text-lilac-300 transition-colors">AWS</h4>
                      <p className="text-sm text-zinc-400">Cloud infrastructure and serverless architecture</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700 hover:border-mauve-400/50 transition-colors group">
                      <h4 className="font-medium mb-2 group-hover:text-mauve-300 transition-colors">GraphQL</h4>
                      <p className="text-sm text-zinc-400">API design and implementation for flexible data fetching</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800 overflow-hidden md:col-span-2">
                <div className="h-1 bg-gradient-to-r from-periwinkle-400 to-lilac-400"></div>
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-6 flex items-center">
                    <Sparkles className="mr-2 h-5 w-5 text-periwinkle-300" />
                    Core Competencies
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700">
                      <div className="w-12 h-12 rounded-full bg-lavender-400/20 flex items-center justify-center mb-4">
                        <span className="text-lavender-300 text-xl font-bold">01</span>
                      </div>
                      <h4 className="text-lg font-medium mb-2">Systems Programming</h4>
                      <p className="text-zinc-400">
                        Developing high-performance, low-level software with a focus on memory safety and efficiency.
                      </p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700">
                      <div className="w-12 h-12 rounded-full bg-periwinkle-400/20 flex items-center justify-center mb-4">
                        <span className="text-periwinkle-300 text-xl font-bold">02</span>
                      </div>
                      <h4 className="text-lg font-medium mb-2">Distributed Systems</h4>
                      <p className="text-zinc-400">
                        Designing and implementing scalable, fault-tolerant distributed systems and microservices.
                      </p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700">
                      <div className="w-12 h-12 rounded-full bg-lilac-400/20 flex items-center justify-center mb-4">
                        <span className="text-lilac-300 text-xl font-bold">03</span>
                      </div>
                      <h4 className="text-lg font-medium mb-2">Functional Programming</h4>
                      <p className="text-zinc-400">
                        Applying functional programming principles to create maintainable and testable code.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Experience Section */}
          <TabsContent value="experience" className="mt-6" id="experience">
            <h2 className="text-3xl font-bold mb-10 flex items-center">
              <span className="bg-lavender-500 w-6 h-1 rounded-full mr-3"></span>
              Work Experience
            </h2>
            <div className="space-y-12">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="w-full md:w-1/3">
                  <div className="sticky top-24">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                      <div className="text-lavender-300 font-medium mb-1">2021 - Present</div>
                      <h3 className="text-2xl font-bold mb-2">Staff Software Engineer</h3>
                      <div className="text-zinc-300 mb-4">TechCorp Inc.</div>
                      <div className="flex flex-wrap gap-2 mb-6">
                        <Badge className="bg-lavender-500/20 text-lavender-200 border-lavender-500/30 hover:bg-lavender-500/30">
                          Rust
                        </Badge>
                        <Badge className="bg-periwinkle-500/20 text-periwinkle-200 border-periwinkle-500/30 hover:bg-periwinkle-500/30">
                          Distributed Systems
                        </Badge>
                        <Badge className="bg-lilac-500/20 text-lilac-200 border-lilac-500/30 hover:bg-lilac-500/30">
                          Kubernetes
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-zinc-700 hover:bg-zinc-800 text-zinc-300"
                      >
                        Company Website
                        <ExternalLink className="ml-2 h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="w-full md:w-2/3">
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-6">
                      <div className="prose prose-invert max-w-none">
                        <p className="text-lg leading-relaxed mb-4 text-zinc-300">
                          Leading the development of high-performance distributed systems using Rust. Architected and
                          implemented a fault-tolerant data processing pipeline that handles millions of events per
                          second with sub-millisecond latency.
                        </p>
                        <h4 className="text-lg font-medium mt-6 mb-3">Key Achievements</h4>
                        <ul className="space-y-2 text-zinc-300">
                          <li className="flex items-start">
                            <span className="inline-block w-1.5 h-1.5 bg-lavender-400 rounded-full mt-2 mr-2"></span>
                            Designed and implemented a distributed tracing system that reduced debugging time by 60%
                          </li>
                          <li className="flex items-start">
                            <span className="inline-block w-1.5 h-1.5 bg-lavender-400 rounded-full mt-2 mr-2"></span>
                            Led a team of 8 engineers to rebuild the core data processing pipeline, improving throughput
                            by 300%
                          </li>
                          <li className="flex items-start">
                            <span className="inline-block w-1.5 h-1.5 bg-lavender-400 rounded-full mt-2 mr-2"></span>
                            Reduced infrastructure costs by 40% through optimization of resource utilization
                          </li>
                          <li className="flex items-start">
                            <span className="inline-block w-1.5 h-1.5 bg-lavender-400 rounded-full mt-2 mr-2"></span>
                            Mentored junior engineers and established best practices for Rust development
                          </li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-8">
                <div className="w-full md:w-1/3">
                  <div className="sticky top-24">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                      <div className="text-sky-300 font-medium mb-1">2018 - 2021</div>
                      <h3 className="text-2xl font-bold mb-2">Senior Software Engineer</h3>
                      <div className="text-zinc-300 mb-4">DataFlow Systems</div>
                      <div className="flex flex-wrap gap-2 mb-6">
                        <Badge className="bg-sky-500/20 text-sky-200 border-sky-500/30 hover:bg-sky-500/30">Rust</Badge>
                        <Badge className="bg-teal-500/20 text-teal-200 border-teal-500/30 hover:bg-teal-500/30">
                          Go
                        </Badge>
                        <Badge className="bg-mint-500/20 text-mint-200 border-mint-500/30 hover:bg-mint-500/30">
                          Microservices
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-zinc-700 hover:bg-zinc-800 text-zinc-300"
                      >
                        Company Website
                        <ExternalLink className="ml-2 h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="w-full md:w-2/3">
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-6">
                      <div className="prose prose-invert max-w-none">
                        <p className="text-lg leading-relaxed mb-4 text-zinc-300">
                          Developed and maintained microservices using Go and Rust. Implemented a real-time analytics
                          platform that reduced data processing time by 70%. Mentored junior developers and led code
                          reviews.
                        </p>
                        <h4 className="text-lg font-medium mt-6 mb-3">Key Achievements</h4>
                        <ul className="space-y-2 text-zinc-300">
                          <li className="flex items-start">
                            <span className="inline-block w-1.5 h-1.5 bg-sky-400 rounded-full mt-2 mr-2"></span>
                            Built a high-throughput message processing system handling 50,000 messages per second
                          </li>
                          <li className="flex items-start">
                            <span className="inline-block w-1.5 h-1.5 bg-sky-400 rounded-full mt-2 mr-2"></span>
                            Implemented a caching layer that reduced database load by 80%
                          </li>
                          <li className="flex items-start">
                            <span className="inline-block w-1.5 h-1.5 bg-sky-400 rounded-full mt-2 mr-2"></span>
                            Designed and implemented a service discovery mechanism for microservices
                          </li>
                          <li className="flex items-start">
                            <span className="inline-block w-1.5 h-1.5 bg-sky-400 rounded-full mt-2 mr-2"></span>
                            Contributed to open-source Go and Rust libraries for data processing
                          </li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-8">
                <div className="w-full md:w-1/3">
                  <div className="sticky top-24">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                      <div className="text-lilac-300 font-medium mb-1">2015 - 2018</div>
                      <h3 className="text-2xl font-bold mb-2">Software Engineer</h3>
                      <div className="text-zinc-300 mb-4">Functional Solutions Ltd.</div>
                      <div className="flex flex-wrap gap-2 mb-6">
                        <Badge className="bg-lilac-500/20 text-lilac-200 border-lilac-500/30 hover:bg-lilac-500/30">
                          Haskell
                        </Badge>
                        <Badge className="bg-sky-500/20 text-sky-200 border-sky-500/30 hover:bg-sky-500/30">
                          TypeScript
                        </Badge>
                        <Badge className="bg-lavender-500/20 text-lavender-200 border-lavender-500/30 hover:bg-lavender-500/30">
                          Functional Programming
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-zinc-700 hover:bg-zinc-800 text-zinc-300"
                      >
                        Company Website
                        <ExternalLink className="ml-2 h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="w-full md:w-2/3">
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-6">
                      <div className="prose prose-invert max-w-none">
                        <p className="text-lg leading-relaxed mb-4 text-zinc-300">
                          Built web applications using Haskell and TypeScript. Designed and implemented a type-safe API
                          framework that improved developer productivity and reduced bugs by enforcing compile-time
                          constraints.
                        </p>
                        <h4 className="text-lg font-medium mt-6 mb-3">Key Achievements</h4>
                        <ul className="space-y-2 text-zinc-300">
                          <li className="flex items-start">
                            <span className="inline-block w-1.5 h-1.5 bg-lilac-400 rounded-full mt-2 mr-2"></span>
                            Created a functional reactive programming library for frontend development
                          </li>
                          <li className="flex items-start">
                            <span className="inline-block w-1.5 h-1.5 bg-lilac-400 rounded-full mt-2 mr-2"></span>
                            Developed a type-safe API client generator that eliminated runtime type errors
                          </li>
                          <li className="flex items-start">
                            <span className="inline-block w-1.5 h-1.5 bg-lilac-400 rounded-full mt-2 mr-2"></span>
                            Implemented property-based testing that caught edge cases in business logic
                          </li>
                          <li className="flex items-start">
                            <span className="inline-block w-1.5 h-1.5 bg-lilac-400 rounded-full mt-2 mr-2"></span>
                            Presented talks on functional programming at local meetups and conferences
                          </li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Projects Section */}
          <TabsContent value="projects" className="mt-6" id="projects">
            <h2 className="text-3xl font-bold mb-10 flex items-center">
              <span className="bg-lavender-500 w-6 h-1 rounded-full mr-3"></span>
              Featured Projects
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="bg-zinc-900 border-zinc-800 overflow-hidden group hover:border-lavender-400/50 transition-all duration-300">
                <div className="relative h-48 overflow-hidden">
                  <img
                    src="/placeholder.svg?height=400&width=600"
                    alt="RustDataFlow"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>
                  <div className="absolute bottom-4 left-4">
                    <Badge className="bg-lavender-400/80 text-white border-none">Rust</Badge>
                  </div>
                </div>
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-2 group-hover:text-lavender-300 transition-colors">
                    RustDataFlow
                  </h3>
                  <p className="text-zinc-400 mb-4">
                    A high-performance data processing library written in Rust that provides type-safe stream processing
                    with minimal overhead.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">Async</Badge>
                    <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">Data Processing</Badge>
                    <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">Performance</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-zinc-400 hover:text-lavender-300 hover:bg-zinc-800 p-0"
                    >
                      <Github className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full border-zinc-700 hover:bg-zinc-800 hover:border-lavender-400/50 text-zinc-300"
                    >
                      View Project
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800 overflow-hidden group hover:border-sky-400/50 transition-all duration-300">
                <div className="relative h-48 overflow-hidden">
                  <img
                    src="/placeholder.svg?height=400&width=600"
                    alt="FunctionalTS"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>
                  <div className="absolute bottom-4 left-4">
                    <Badge className="bg-sky-400/80 text-white border-none">TypeScript</Badge>
                  </div>
                </div>
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-2 group-hover:text-sky-300 transition-colors">FunctionalTS</h3>
                  <p className="text-zinc-400 mb-4">
                    A TypeScript library inspired by Haskell that brings functional programming patterns to frontend
                    development with zero runtime overhead.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">Functional</Badge>
                    <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">Frontend</Badge>
                    <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">Type Safety</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-zinc-400 hover:text-sky-300 hover:bg-zinc-800 p-0"
                    >
                      <Github className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full border-zinc-700 hover:bg-zinc-800 hover:border-sky-400/50 text-zinc-300"
                    >
                      View Project
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800 overflow-hidden group hover:border-teal-400/50 transition-all duration-300">
                <div className="relative h-48 overflow-hidden">
                  <img
                    src="/placeholder.svg?height=400&width=600"
                    alt="GoMicroServices"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>
                  <div className="absolute bottom-4 left-4">
                    <Badge className="bg-teal-400/80 text-white border-none">Go</Badge>
                  </div>
                </div>
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-2 group-hover:text-teal-300 transition-colors">
                    GoMicroServices
                  </h3>
                  <p className="text-zinc-400 mb-4">
                    A toolkit for building microservices in Go with built-in observability, circuit breaking, and
                    service discovery.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">Microservices</Badge>
                    <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">Observability</Badge>
                    <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">Resilience</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-zinc-400 hover:text-teal-300 hover:bg-zinc-800 p-0"
                    >
                      <Github className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full border-zinc-700 hover:bg-zinc-800 hover:border-teal-400/50 text-zinc-300"
                    >
                      View Project
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800 overflow-hidden group hover:border-periwinkle-400/50 transition-all duration-300">
                <div className="relative h-48 overflow-hidden">
                  <img
                    src="/placeholder.svg?height=400&width=600"
                    alt="WebAssemblyCompiler"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>
                  <div className="absolute bottom-4 left-4">
                    <Badge className="bg-periwinkle-400/80 text-white border-none">WebAssembly</Badge>
                  </div>
                </div>
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-2 group-hover:text-periwinkle-300 transition-colors">
                    WebAssemblyCompiler
                  </h3>
                  <p className="text-zinc-400 mb-4">
                    An experimental compiler that targets WebAssembly, written in Rust, with a focus on performance and
                    small binary size.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">Rust</Badge>
                    <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">WebAssembly</Badge>
                    <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">Compiler</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-zinc-400 hover:text-periwinkle-300 hover:bg-zinc-800 p-0"
                    >
                      <Github className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full border-zinc-700 hover:bg-zinc-800 hover:border-periwinkle-400/50 text-zinc-300"
                    >
                      View Project
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Contact Section */}
      <section className="py-20 relative overflow-hidden" id="contact">
        <div className="absolute inset-0 bg-gradient-to-b from-lavender-900/10 to-black/50 opacity-70"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-lavender-500/10 rounded-full blur-3xl"></div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Get In Touch</h2>
            <p className="text-zinc-400 mb-8">
              Interested in working together? Feel free to reach out through any of the channels below.
            </p>
            <div className="flex justify-center gap-4 mb-8">
              <Button className="rounded-full bg-lavender-500 hover:bg-lavender-600 text-white">
                <Mail className="mr-2 h-4 w-4" />
                Contact Me
              </Button>
              <Button variant="outline" className="rounded-full border-zinc-700 hover:bg-zinc-800 text-zinc-300">
                <Github className="mr-2 h-4 w-4" />
                GitHub
              </Button>
              <Button variant="outline" className="rounded-full border-zinc-700 hover:bg-zinc-800 text-zinc-300">
                <Linkedin className="mr-2 h-4 w-4" />
                LinkedIn
              </Button>
            </div>
          </div>

          <Card className="bg-zinc-900/80 border-zinc-800 backdrop-blur-sm max-w-3xl mx-auto">
            <CardContent className="p-6">
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium text-zinc-300">
                      Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-lavender-400 focus:border-transparent"
                      placeholder="Your name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium text-zinc-300">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-lavender-400 focus:border-transparent"
                      placeholder="Your email"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="subject" className="text-sm font-medium text-zinc-300">
                    Subject
                  </label>
                  <input
                    id="subject"
                    type="text"
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-lavender-400 focus:border-transparent"
                    placeholder="Subject"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="message" className="text-sm font-medium text-zinc-300">
                    Message
                  </label>
                  <textarea
                    id="message"
                    rows={5}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-lavender-400 focus:border-transparent"
                    placeholder="Your message"
                  ></textarea>
                </div>
                <Button className="w-full bg-lavender-500 hover:bg-lavender-600 text-white">Send Message</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-900 border-t border-zinc-800 py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-lavender-500 flex items-center justify-center text-white font-bold">
              JD
            </div>
            <span className="font-semibold tracking-tight">Jane Doe</span>
          </div>
          <p className="text-zinc-500 mb-6">© {new Date().getFullYear()} Jane Doe. All rights reserved.</p>
          <div className="flex justify-center gap-6 text-zinc-400">
            <a href="#" className="hover:text-white transition-colors">
              Home
            </a>
            <a href="#about" className="hover:text-white transition-colors">
              About
            </a>
            <a href="#skills" className="hover:text-white transition-colors">
              Skills
            </a>
            <a href="#experience" className="hover:text-white transition-colors">
              Experience
            </a>
            <a href="#projects" className="hover:text-white transition-colors">
              Projects
            </a>
            <a href="#contact" className="hover:text-white transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

