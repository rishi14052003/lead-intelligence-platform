
export interface Lead {
  name: string;
  role: string;
  email?: string;
  linkedin?: string;
  score?: number;
}

const mockLeads: Lead[] = [
  {
    name: "John Smith",
    role: "CEO",
    email: "john.smith@tesla.com",
    linkedin: "https://linkedin.com/in/johnsmith",
    score: 95
  },
  {
    name: "Sarah Johnson",
    role: "CTO",
    email: "sarah.j@tesla.com",
    linkedin: "https://linkedin.com/in/sarahjohnson",
    score: 88
  },
  {
    name: "Michael Chen",
    role: "VP of Sales",
    email: "m.chen@tesla.com",
    linkedin: "https://linkedin.com/in/michaelchen",
    score: 92
  },
  {
    name: "Emily Davis",
    role: "Head of HR",
    email: "emily.d@tesla.com",
    linkedin: "https://linkedin.com/in/emilydavis",
    score: 85
  },
  {
    name: "Robert Wilson",
    role: "Engineering Manager",
    email: "r.wilson@tesla.com",
    linkedin: "https://linkedin.com/in/robertwilson",
    score: 90
  }
];

export async function searchLeads(_query: string) {
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  return mockLeads;
}
