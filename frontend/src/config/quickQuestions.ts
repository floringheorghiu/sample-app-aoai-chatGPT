// Quick questions configuration based on FEv2's onboardingQuickQuestions.json
// This matches the exact structure from frontend-v2/admin/onboardingQuickQuestions.json

export interface QuickQuestionTopic {
  label: string
  questions: string[]
}

interface QuickQuestionsConfig {
  [key: string]: {
    topics: QuickQuestionTopic[]
  }
}

// Import the exact data from the JSON file to ensure consistency
export const quickQuestionsConfig: QuickQuestionsConfig = {
  elev: {
    topics: [
      {
        label: "să învăț mai bine și să primesc sfaturi pentru teme și școală",
        questions: [
          "Am o temă grea. Cum pot să-mi ușurez munca?",
          "Cum învăț mai eficient pentru un test important?",
          "Ce pot face când mă plictisesc la ore?"
        ]
      },
      {
        label: "cum să îmi înțeleg emoțiile și să depășesc momentele grele",
        questions: [
          "Ce pot face când mă simt trist sau nervos?",
          "Cum pot vorbi despre ce simt fără să-mi fie rușine?",
          "Cum mă pot calma înainte de un test sau o prezentare?"
        ]
      },
      {
        label: "cum să fiu în siguranța online cu prietenii și să mă protejez",
        questions: [
          "Ce fac dacă cineva mă jignește online?",
          "Cum știu dacă o persoană e periculoasă pe internet?",
          "Ce informații personale nu ar trebui să postez?"
        ]
      },
      {
        label: "să am curajul de a spune ce gândesc și să fiu auzit la școală",
        questions: [
          "Cum pot să vorbesc în fața clasei fără emoții?",
          "Ce pot face dacă am o idee bună, dar îmi e frică să o spun?",
          "Cum pot cere ajutor de la profesori fără să mă simt prost?"
        ]
      }
    ]
  },
  // Handle both "parinte" (from JSON) and "părinte" (from types) for compatibility
  parinte: {
    topics: [
      {
        label: "să îmi ajut copilul la școală cu sfaturi pentru teme și obiceiuri bune acasă",
        questions: [
          "Cum pot face temele mai ușor de suportat pentru copilul meu?",
          "Ce rutine zilnice pot ajuta la învățare?",
          "Ce fac dacă copilul meu nu vrea să învețe?"
        ]
      },
      {
        label: "cum să vorbesc cu profesorii de la școală și cum să colaborez mai bine cu aceștia",
        questions: [
          "Cum pot comunica eficient cu profesorii?",
          "Ce întrebări ar trebui să pun la o ședință cu învățătorul?",
          "Ce fac dacă nu sunt de acord cu o decizie a școlii?"
        ]
      },
      {
        label: "cum să am grijă de mintea și sufletul copilului meu, să-i înțeleg și să-i susțin emoțiile",
        questions: [
          "Cum recunosc dacă copilul meu e stresat sau anxios?",
          "Cum vorbesc cu copilul despre emoții fără să-l presez?",
          "Ce activități ajută la echilibrul emoțional al copiilor?"
        ]
      },
      {
        label: "cum să fiu parte din școală și comunitate prin deciziile și sprijinul meu",
        questions: [
          "Cum pot contribui ca părinte în viața școlii?",
          "Ce rol pot avea în luarea deciziilor legate de clasă?",
          "Cum pot ajuta alți părinți să se implice și ei?"
        ]
      }
    ]
  },
  profesor: {
    topics: [
      {
        label: "să ajut elevii să învețe singuri prin strategii noi de succes școlar și dezvoltare",
        questions: [
          "Ce metode pot folosi pentru a stimula autonomia la elevi?",
          "Cum îi ajut să-și seteze obiective de învățare?",
          "Ce funcționează când un elev spune 'nu pot'?"
        ]
      },
      {
        label: "cum să creez un mediu de învățare pozitiv și sigur pentru a avea o clasă de elevi fericiți",
        questions: [
          "Cum gestionez conflictele dintre elevi?",
          "Ce pot face pentru a reduce stresul în clasă?",
          "Cum încurajez comportamentele pozitive?"
        ]
      },
      {
        label: "cum să lucrez împreună cu familiile și comunitatea pentru a oferi o educație mai bună",
        questions: [
          "Cum pot implica mai activ părinții în educație?",
          "Ce tip de comunicare funcționează cel mai bine cu familia elevilor?",
          "Cum transform o plângere într-o colaborare?"
        ]
      },
      {
        label: "cum să mă dezvolt ca profesor și să am mai multă încredere în abilitățile mele",
        questions: [
          "Cum pot primi feedback constructiv fără să mă simt criticat?",
          "Ce pot face pentru a-mi recăpăta motivația ca profesor?",
          "Ce resurse mă pot ajuta să devin mai bun în meseria mea?"
        ]
      }
    ]
  }
}

// Add părinte as an alias to parinte for type compatibility
quickQuestionsConfig.părinte = quickQuestionsConfig.parinte

// Helper function to get topics for a persona, handling the diacritic difference
export const getTopicsForPersona = (persona: string): QuickQuestionTopic[] => {
  // Normalize persona key - handle both "părinte" and "parinte"
  const normalizedPersona = persona === 'părinte' ? 'parinte' : persona
  return quickQuestionsConfig[normalizedPersona]?.topics || []
}

// Helper function to get a specific topic by label for a persona
export const getTopicByLabel = (persona: string, topicLabel: string): QuickQuestionTopic | null => {
  const topics = getTopicsForPersona(persona)
  return topics.find(topic => topic.label === topicLabel) || null
}

// Helper function to get quick questions for a specific persona and topic
export const getQuickQuestionsForTopic = (persona: string, topicLabel: string): string[] => {
  const topic = getTopicByLabel(persona, topicLabel)
  return topic?.questions || []
}

// Helper function to get quick questions by persona and topic index (0-3)
export const getQuickQuestionsByIndex = (persona: string, topicIndex: number): string[] => {
  const topics = getTopicsForPersona(persona)
  if (topicIndex >= 0 && topicIndex < topics.length) {
    return topics[topicIndex].questions || []
  }
  return []
}

// Helper function to get topic index from topic label
export const getTopicIndex = (persona: string, topicLabel: string): number => {
  const topics = getTopicsForPersona(persona)
  return topics.findIndex(topic => topic.label === topicLabel)
}