export interface Translations {
  nav: {
    home: string;
    about: string;
    projects: string;
    volunteer: string;
    donate: string;
    contact: string;
    membership: string;
  };
  hero: {
    title: string;
    subtitle: string;
    license: string;
    date: string;
    learnMore: string;
    donateNow: string;
    membership: string;
    watchVideo: string;
  };
  about: {
    title: string;
    description: string;
    goalsTitle: string;
    goals: string[];
    teamTitle: string;
    teamDescription: string;
  };
  projects: {
    title: string;
    project1: {
      title: string;
      description: string;
    };
    project2: {
      title: string;
      description: string;
    };
  };
  volunteer: {
    title: string;
    subtitle: string;
    options: string[];
    contact: string;
  };
  donation: {
    title: string;
    subtitle: string;
    banks: string[];
    successTitle: string;
    successMessage: string;
    copyNumber: string;
    contactMessage: string;
    donationNumber: string;
  };
  contact: {
    title: string;
    address: string;
    phone: string;
    email: string;
    follow: string;
  };
  membership: {
    title: string;
    subtitle: string;
    description: string;
    benefitsTitle: string;
    benefits: string[];
    formTitle: string;
    formButton: string;
    closingMessage: string;
  };
  footer: {
    rights: string;
    description: string;
  };
  homePage: {
    platform: string;
    welcome: string;
    welcomeDesc: string;
    totalMembers: string;
    member: string;
    contribute: string;
    totalDonations: string;
  };
}
