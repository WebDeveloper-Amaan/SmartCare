require('dotenv').config()
const mongoose = require('mongoose')
const User = require('./models/User')

const sampleBabysitters = [
  {
    name: 'Priya Sharma', email: 'priya@babycare.in', phone: '+919876543210',
    password: 'Priya@Secure#2024!', role: 'babysitter', location: 'South Delhi',
    coordinates: { type: 'Point', coordinates: [77.2066, 28.5245] },
    experience: 3, hourlyRate: 300, rating: 5.0, reviewCount: 48,
    verified: true, phoneVerified: true, emailVerified: true, kycStatus: 'approved',
    bio: 'Passionate childcare provider with 3+ years of experience. Specialized in infant care and early childhood development.',
    skills: ['Infant Care', 'First Aid', 'Meal Preparation', 'Educational Activities'],
    availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    ageGroups: ['Infant (0-1)', 'Toddler (1-3)', 'Preschool (3-5)'],
    languages: ['Hindi', 'English'],
    education: 'B.A. in Child Psychology',
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop'
  },
  {
    name: 'Anjali Gupta', email: 'anjali@babycare.in', phone: '+919876543211',
    password: 'Anjali@Secure#2024!', role: 'babysitter', location: 'Dwarka',
    coordinates: { type: 'Point', coordinates: [77.0460, 28.5921] },
    experience: 2, hourlyRate: 250, rating: 4.8, reviewCount: 35,
    verified: true, phoneVerified: true, emailVerified: true, kycStatus: 'approved',
    bio: 'B.Ed qualified with expertise in handling toddlers. Love creating fun learning activities.',
    skills: ['Toddler Care', 'Educational Games', 'Storytelling', 'Arts & Crafts'],
    availability: ['Monday', 'Tuesday', 'Wednesday', 'Saturday', 'Sunday'],
    ageGroups: ['Toddler (1-3)', 'Preschool (3-5)', 'School Age (5+)'],
    languages: ['Hindi', 'English', 'Punjabi'],
    education: 'B.Ed',
    photo: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=400&h=400&fit=crop'
  },
  {
    name: 'Neha Verma', email: 'neha@babycare.in', phone: '+919876543212',
    password: 'Neha@Secure#2024!', role: 'babysitter', location: 'Noida',
    coordinates: { type: 'Point', coordinates: [77.3910, 28.5355] },
    experience: 5, hourlyRate: 350, rating: 5.0, reviewCount: 62,
    verified: true, phoneVerified: true, emailVerified: true, kycStatus: 'approved',
    bio: '5+ years experience with child psychology background. Available for night shifts and special needs children.',
    skills: ['Special Needs Care', 'Night Shifts', 'Child Psychology', 'CPR Certified', 'First Aid'],
    availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    ageGroups: ['Infant (0-1)', 'Toddler (1-3)', 'Preschool (3-5)', 'School Age (5+)'],
    languages: ['Hindi', 'English'],
    education: 'M.A. in Child Psychology',
    photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop'
  },
  {
    name: 'Sunita Rao', email: 'sunita@babycare.in', phone: '+919876543213',
    password: 'Sunita@Secure#2024!', role: 'babysitter', location: 'Gurgaon',
    coordinates: { type: 'Point', coordinates: [77.0266, 28.4595] },
    experience: 7, hourlyRate: 450, rating: 4.9, reviewCount: 89,
    verified: true, phoneVerified: true, emailVerified: true, kycStatus: 'approved',
    bio: 'Highly experienced nanny with 7 years. Expert in newborn care and school-age tutoring.',
    skills: ['Newborn Care', 'Homework Help', 'Tutoring', 'Cooking', 'First Aid'],
    availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    ageGroups: ['Infant (0-1)', 'School Age (5+)'],
    languages: ['Hindi', 'English', 'Telugu'],
    education: 'B.Sc Nursing',
    photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop'
  },
  {
    name: 'Kavya Nair', email: 'kavya@babycare.in', phone: '+919876543214',
    password: 'Kavya@Secure#2024!', role: 'babysitter', location: 'Rohini',
    coordinates: { type: 'Point', coordinates: [77.1025, 28.7041] },
    experience: 1, hourlyRate: 180, rating: 4.5, reviewCount: 12,
    verified: true, phoneVerified: true, emailVerified: true, kycStatus: 'approved',
    bio: 'Young and energetic babysitter. Great with toddlers and preschoolers. Love outdoor activities.',
    skills: ['Outdoor Activities', 'Arts & Crafts', 'Storytelling', 'Swimming'],
    availability: ['Saturday', 'Sunday', 'Wednesday', 'Thursday'],
    ageGroups: ['Toddler (1-3)', 'Preschool (3-5)'],
    languages: ['Hindi', 'English', 'Malayalam'],
    education: 'B.A. English',
    photo: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop'
  },
  {
    name: 'Meera Joshi', email: 'meera@babycare.in', phone: '+919876543215',
    password: 'Meera@Secure#2024!', role: 'babysitter', location: 'Faridabad',
    coordinates: { type: 'Point', coordinates: [77.3178, 28.4089] },
    experience: 4, hourlyRate: 320, rating: 4.7, reviewCount: 41,
    verified: true, phoneVerified: true, emailVerified: true, kycStatus: 'approved',
    bio: 'Certified in child nutrition and first aid. Specializes in school-age children and homework support.',
    skills: ['Homework Help', 'Tutoring', 'Cooking', 'First Aid', 'Music'],
    availability: ['Monday', 'Tuesday', 'Thursday', 'Friday', 'Saturday'],
    ageGroups: ['Preschool (3-5)', 'School Age (5+)'],
    languages: ['Hindi', 'English', 'Marathi'],
    education: 'B.Ed + Child Nutrition Certificate',
    photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop'
  },
  {
    name: 'Divya Singh', email: 'divya@babycare.in', phone: '+919876543216',
    password: 'Divya@Secure#2024!', role: 'babysitter', location: 'Vasant Kunj',
    coordinates: { type: 'Point', coordinates: [77.1588, 28.5245] },
    experience: 6, hourlyRate: 400, rating: 4.8, reviewCount: 73,
    verified: true, phoneVerified: true, emailVerified: true, kycStatus: 'approved',
    bio: 'Experienced with special needs children. Trained in ABA therapy and sensory activities.',
    skills: ['Special Needs Care', 'ABA Therapy', 'Sensory Activities', 'CPR Certified', 'First Aid'],
    availability: ['Monday', 'Wednesday', 'Friday', 'Saturday', 'Sunday'],
    ageGroups: ['Toddler (1-3)', 'Preschool (3-5)', 'School Age (5+)'],
    languages: ['Hindi', 'English'],
    education: 'M.Ed Special Education',
    photo: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop'
  },
  {
    name: 'Pooja Mehta', email: 'pooja@babycare.in', phone: '+919876543217',
    password: 'Pooja@Secure#2024!', role: 'babysitter', location: 'Lajpat Nagar',
    coordinates: { type: 'Point', coordinates: [77.2373, 28.5677] },
    experience: 2, hourlyRate: 220, rating: 4.6, reviewCount: 19,
    verified: true, phoneVerified: true, emailVerified: true, kycStatus: 'approved',
    bio: 'Warm and caring babysitter. Excellent at bedtime routines and infant soothing techniques.',
    skills: ['Infant Care', 'Newborn Care', 'Meal Preparation', 'Night Shifts'],
    availability: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    ageGroups: ['Infant (0-1)', 'Toddler (1-3)'],
    languages: ['Hindi', 'English', 'Gujarati'],
    education: 'Diploma in Early Childhood Care',
    photo: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=400&fit=crop'
  },
  {
    name: 'Ritu Kapoor', email: 'ritu@babycare.in', phone: '+919876543218',
    password: 'Ritu@Secure#2024!', role: 'babysitter', location: 'Janakpuri',
    coordinates: { type: 'Point', coordinates: [77.0824, 28.6219] },
    experience: 8, hourlyRate: 500, rating: 5.0, reviewCount: 104,
    verified: true, phoneVerified: true, emailVerified: true, kycStatus: 'approved',
    bio: 'Most experienced sitter on the platform. 8 years, 100+ families served. Expert in all age groups.',
    skills: ['Infant Care', 'Toddler Care', 'Homework Help', 'Cooking', 'First Aid', 'CPR Certified', 'Swimming', 'Music'],
    availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    ageGroups: ['Infant (0-1)', 'Toddler (1-3)', 'Preschool (3-5)', 'School Age (5+)'],
    languages: ['Hindi', 'English', 'Punjabi'],
    education: 'M.A. Child Development',
    photo: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400&h=400&fit=crop'
  },
  {
    name: 'Ananya Das', email: 'ananya@babycare.in', phone: '+919876543219',
    password: 'Ananya@Secure#2024!', role: 'babysitter', location: 'Greater Noida',
    coordinates: { type: 'Point', coordinates: [77.5040, 28.4744] },
    experience: 3, hourlyRate: 280, rating: 4.7, reviewCount: 28,
    verified: true, phoneVerified: true, emailVerified: true, kycStatus: 'approved',
    bio: 'Bilingual babysitter fluent in Bengali and English. Great with school-age kids and tutoring.',
    skills: ['Tutoring', 'Homework Help', 'Educational Games', 'Arts & Crafts', 'Outdoor Activities'],
    availability: ['Monday', 'Tuesday', 'Thursday', 'Saturday', 'Sunday'],
    ageGroups: ['Preschool (3-5)', 'School Age (5+)'],
    languages: ['Hindi', 'English', 'Bengali'],
    education: 'B.Sc Mathematics',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop'
  }
]

const sampleAdmin = {
  name: 'Admin', email: 'admin@smartcare.in', phone: '+919000000000',
  password: 'Admin@SmartCare#2024!', role: 'admin', location: 'Delhi',
  phoneVerified: true, emailVerified: true,
  photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop'
}

const sampleParent = {
  name: 'Test Parent', email: 'parent@smartcare.in', phone: '+919999999999',
  password: 'Parent@SmartCare#2024!', role: 'parent', location: 'South Delhi',
  coordinates: { type: 'Point', coordinates: [77.2090, 28.6139] },
  phoneVerified: true, emailVerified: true,
  photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop'
}

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/babycare')
    console.log('✅ Connected to MongoDB')

    await User.deleteMany({})
    console.log('🗑️  Cleared existing users')

    for (const b of sampleBabysitters) {
      await User.create(b)
      console.log(`✅ Created babysitter: ${b.name} | Skills: ${b.skills.join(', ')}`)
    }

    await User.create(sampleParent)
    console.log(`✅ Created parent: ${sampleParent.name}`)

    await User.create(sampleAdmin)
    console.log(`✅ Created admin: ${sampleAdmin.name}`)

    console.log('\n🎉 Database seeded with 10 babysitters!')
    console.log('\n📝 Test Credentials:')
    console.log('Admin:    admin@smartcare.in  /  Admin@SmartCare#2024!')
    console.log('Parent:   parent@smartcare.in /  Parent@SmartCare#2024!')
    console.log('Sitter:   priya@babycare.in   /  Priya@Secure#2024!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Seeding error:', error)
    process.exit(1)
  }
}

seedDatabase()
