"use client";

import { useState } from "react";

import {
  type AchievementEntry,
  type CertificationEntry,
  type EducationEntry,
  type ExperienceEntry,
  type ProjectEntry,
  type ResumeBasics,
  type ResumeData,
  type ResumeSkills,
  type ResumeTemplate,
  emptyAchievement,
  emptyBasics,
  emptyCertification,
  emptyEducation,
  emptyExperience,
  emptyProject,
  emptySkills,
} from "@/lib/resume";

const updateListEntry = <T, K extends keyof T>(
  entries: T[],
  index: number,
  field: K,
  value: T[K],
) => entries.map((entry, entryIndex) => (entryIndex === index ? { ...entry, [field]: value } : entry));

export function useResumeStore(initialTemplate: ResumeTemplate = "modern") {
  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplate>(initialTemplate);
  const [basics, setBasics] = useState<ResumeBasics>(emptyBasics);
  const [education, setEducation] = useState<EducationEntry[]>([emptyEducation()]);
  const [experience, setExperience] = useState<ExperienceEntry[]>([emptyExperience()]);
  const [projects, setProjects] = useState<ProjectEntry[]>([emptyProject()]);
  const [skills, setSkills] = useState<ResumeSkills>(emptySkills);
  const [certifications, setCertifications] = useState<CertificationEntry[]>([
    emptyCertification(),
  ]);
  const [achievements, setAchievements] = useState<AchievementEntry[]>([
    emptyAchievement(),
  ]);

  const resumeData: ResumeData = {
    ...basics,
    education,
    experience,
    projects,
    skills,
    certifications,
    achievements,
  };

  const updateBasic = (field: keyof ResumeBasics, value: string) => {
    setBasics((current) => ({ ...current, [field]: value }));
  };

  const updateSkill = (field: keyof ResumeSkills, value: string) => {
    setSkills((current) => ({ ...current, [field]: value }));
  };

  const updateEducation = (
    index: number,
    field: keyof EducationEntry,
    value: string,
  ) => {
    setEducation((current) => updateListEntry(current, index, field, value));
  };

  const updateExperience = (
    index: number,
    field: keyof ExperienceEntry,
    value: string,
  ) => {
    setExperience((current) => updateListEntry(current, index, field, value));
  };

  const updateProject = (index: number, field: keyof ProjectEntry, value: string) => {
    setProjects((current) => updateListEntry(current, index, field, value));
  };

  const updateCertification = (
    index: number,
    field: keyof CertificationEntry,
    value: string,
  ) => {
    setCertifications((current) => updateListEntry(current, index, field, value));
  };

  const updateAchievement = (
    index: number,
    field: keyof AchievementEntry,
    value: string,
  ) => {
    setAchievements((current) => updateListEntry(current, index, field, value));
  };

  const addEducation = () => setEducation((current) => [...current, emptyEducation()]);
  const addExperience = () => setExperience((current) => [...current, emptyExperience()]);
  const addProject = () => setProjects((current) => [...current, emptyProject()]);
  const addCertification = () =>
    setCertifications((current) => [...current, emptyCertification()]);
  const addAchievement = () => setAchievements((current) => [...current, emptyAchievement()]);

  const removeEducation = (index: number) =>
    setEducation((current) => (current.length > 1 ? current.filter((_, itemIndex) => itemIndex !== index) : current));
  const removeExperience = (index: number) =>
    setExperience((current) => (current.length > 1 ? current.filter((_, itemIndex) => itemIndex !== index) : current));
  const removeProject = (index: number) =>
    setProjects((current) => (current.length > 1 ? current.filter((_, itemIndex) => itemIndex !== index) : current));
  const removeCertification = (index: number) =>
    setCertifications((current) =>
      current.length > 1 ? current.filter((_, itemIndex) => itemIndex !== index) : current,
    );
  const removeAchievement = (index: number) =>
    setAchievements((current) =>
      current.length > 1 ? current.filter((_, itemIndex) => itemIndex !== index) : current,
    );

  const applyResumePatch = (patch: Partial<ResumeData>) => {
    if ("education" in patch && patch.education) {
      setEducation(patch.education);
    }
    if ("experience" in patch && patch.experience) {
      setExperience(patch.experience);
    }
    if ("projects" in patch && patch.projects) {
      setProjects(patch.projects);
    }
    if ("skills" in patch && patch.skills) {
      setSkills((current) => ({ ...current, ...patch.skills }));
    }
    if ("certifications" in patch && patch.certifications) {
      setCertifications(patch.certifications);
    }
    if ("achievements" in patch && patch.achievements) {
      setAchievements(patch.achievements);
    }

    setBasics((current) => ({
      ...current,
      ...(patch.fullName !== undefined ? { fullName: patch.fullName } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
      ...(patch.email !== undefined ? { email: patch.email } : {}),
      ...(patch.linkedin !== undefined ? { linkedin: patch.linkedin } : {}),
      ...(patch.github !== undefined ? { github: patch.github } : {}),
      ...(patch.location !== undefined ? { location: patch.location } : {}),
      ...(patch.relocate !== undefined ? { relocate: patch.relocate } : {}),
      ...(patch.targetRole !== undefined ? { targetRole: patch.targetRole } : {}),
      ...(patch.experienceYears !== undefined
        ? { experienceYears: patch.experienceYears }
        : {}),
      ...(patch.topSkills !== undefined ? { topSkills: patch.topSkills } : {}),
      ...(patch.biggestAchievement !== undefined
        ? { biggestAchievement: patch.biggestAchievement }
        : {}),
      ...(patch.professionalSummary !== undefined
        ? { professionalSummary: patch.professionalSummary }
        : {}),
      ...(patch.valueProposition !== undefined
        ? { valueProposition: patch.valueProposition }
        : {}),
    }));
  };

  const resetResumeState = (template: ResumeTemplate = initialTemplate) => {
    setSelectedTemplate(template);
    setBasics(emptyBasics());
    setEducation([emptyEducation()]);
    setExperience([emptyExperience()]);
    setProjects([emptyProject()]);
    setSkills(emptySkills());
    setCertifications([emptyCertification()]);
    setAchievements([emptyAchievement()]);
  };

  return {
    selectedTemplate,
    setSelectedTemplate,
    basics,
    education,
    experience,
    projects,
    skills,
    certifications,
    achievements,
    resumeData,
    updateBasic,
    updateSkill,
    updateEducation,
    updateExperience,
    updateProject,
    updateCertification,
    updateAchievement,
    addEducation,
    addExperience,
    addProject,
    addCertification,
    addAchievement,
    removeEducation,
    removeExperience,
    removeProject,
    removeCertification,
    removeAchievement,
    applyResumePatch,
    resetResumeState,
  };
}
