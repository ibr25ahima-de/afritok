/**
 * Micro-Tasks System for Afritok
 * Simple tasks and micro-jobs that anyone can do to earn money
 */

import { eq } from 'drizzle-orm';
import { getDb } from './db';

export interface MicroTask {
  id: string;
  title: string;
  description: string;
  category: 'survey' | 'test' | 'review' | 'watch_ad' | 'transcribe' | 'translate' | 'categorize' | 'rate';
  reward: number; // in USD
  estimatedTime: number; // in minutes
  difficulty: 'easy' | 'medium' | 'hard';
  status: 'available' | 'in_progress' | 'completed' | 'archived';
  totalSlots: number; // How many people can do this task
  completedSlots: number; // How many have completed
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserTaskCompletion {
  id: string;
  userId: number;
  taskId: string;
  status: 'pending_review' | 'approved' | 'rejected';
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: number;
  feedback?: string;
}

// Task templates for easy creation
export const TASK_TEMPLATES = {
  survey: {
    title: 'Quick Survey - {{topic}}',
    description: 'Answer 5-10 questions about {{topic}}. Takes about 5 minutes.',
    category: 'survey' as const,
    reward: 0.05,
    estimatedTime: 5,
    difficulty: 'easy' as const,
  },
  watch_ad: {
    title: 'Watch Advertisement',
    description: 'Watch a 30-second advertisement. That\'s it!',
    category: 'watch_ad' as const,
    reward: 0.02,
    estimatedTime: 1,
    difficulty: 'easy' as const,
  },
  review: {
    title: 'Write Review - {{product}}',
    description: 'Write a short review (50-100 words) about {{product}}',
    category: 'review' as const,
    reward: 0.10,
    estimatedTime: 3,
    difficulty: 'easy' as const,
  },
  transcribe: {
    title: 'Transcribe Audio',
    description: 'Listen to a 1-minute audio and type what you hear',
    category: 'transcribe' as const,
    reward: 0.25,
    estimatedTime: 5,
    difficulty: 'medium' as const,
  },
  translate: {
    title: 'Translate Text - {{language}}',
    description: 'Translate 50-100 words from English to {{language}}',
    category: 'translate' as const,
    reward: 0.15,
    estimatedTime: 5,
    difficulty: 'medium' as const,
  },
  categorize: {
    title: 'Categorize Items',
    description: 'Sort 20 items into the correct categories',
    category: 'categorize' as const,
    reward: 0.05,
    estimatedTime: 3,
    difficulty: 'easy' as const,
  },
  rate: {
    title: 'Rate Content',
    description: 'Rate 10 images or videos on a scale of 1-5',
    category: 'rate' as const,
    reward: 0.05,
    estimatedTime: 3,
    difficulty: 'easy' as const,
  },
  test_app: {
    title: 'Test Mobile App',
    description: 'Download and test a new app, then answer questions',
    category: 'test' as const,
    reward: 0.50,
    estimatedTime: 15,
    difficulty: 'medium' as const,
  },
};

/**
 * Create a new task
 */
export async function createTask(
  title: string,
  description: string,
  category: MicroTask['category'],
  reward: number,
  estimatedTime: number,
  difficulty: MicroTask['difficulty'],
  totalSlots: number,
  expiresAt: Date
): Promise<MicroTask | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const task: MicroTask = {
      id: `task-${Date.now()}`,
      title,
      description,
      category,
      reward,
      estimatedTime,
      difficulty,
      status: 'available',
      totalSlots,
      completedSlots: 0,
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to database
    // await db.insert(microTasks).values(task);

    return task;
  } catch (error) {
    console.error('Failed to create task:', error);
    return null;
  }
}

/**
 * Get available tasks
 */
export async function getAvailableTasks(
  limit: number = 50,
  offset: number = 0,
  category?: MicroTask['category'],
  difficulty?: MicroTask['difficulty']
): Promise<MicroTask[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    // Implement with database query
    // SELECT * FROM microTasks WHERE status = 'available' AND expiresAt > NOW() AND completedSlots < totalSlots
    // Filter by category and difficulty if provided
    // ORDER BY reward DESC, estimatedTime ASC
    // LIMIT ? OFFSET ?

    return [];
  } catch (error) {
    console.error('Failed to get available tasks:', error);
    return [];
  }
}

/**
 * Get user's task completions
 */
export async function getUserTaskCompletions(
  userId: number,
  limit: number = 50,
  offset: number = 0
): Promise<UserTaskCompletion[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    // Implement with database query
    // SELECT * FROM userTaskCompletions WHERE userId = ? ORDER BY submittedAt DESC LIMIT ? OFFSET ?

    return [];
  } catch (error) {
    console.error('Failed to get user task completions:', error);
    return [];
  }
}

/**
 * Submit task completion
 */
export async function submitTaskCompletion(
  userId: number,
  taskId: string,
  submissionData: Record<string, any>
): Promise<UserTaskCompletion | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    // Check if task exists and is available
    const task = await getTaskById(taskId);
    if (!task || task.status !== 'available') {
      return null;
    }

    // Check if user already completed this task
    const alreadyCompleted = await hasUserCompletedTask(userId, taskId);
    if (alreadyCompleted) {
      return null;
    }

    // Check if task has available slots
    if (task.completedSlots >= task.totalSlots) {
      return null;
    }

    const completion: UserTaskCompletion = {
      id: `completion-${Date.now()}`,
      userId,
      taskId,
      status: 'pending_review',
      submittedAt: new Date(),
    };

    // Save to database
    // await db.insert(userTaskCompletions).values(completion);

    return completion;
  } catch (error) {
    console.error('Failed to submit task completion:', error);
    return null;
  }
}

/**
 * Approve task completion
 */
export async function approveTaskCompletion(
  completionId: string,
  reviewedBy: number,
  feedback?: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    // Update completion status
    // UPDATE userTaskCompletions SET status = 'approved', reviewedAt = NOW(), reviewedBy = ?, feedback = ? WHERE id = ?

    // Get the completion and task
    const completion = await getTaskCompletionById(completionId);
    if (!completion) return false;

    const task = await getTaskById(completion.taskId);
    if (!task) return false;

    // Add earnings to user
    // INSERT INTO microEarnings (userId, type, amount, taskId, status) VALUES (?, 'task', ?, ?, 'completed')

    return true;
  } catch (error) {
    console.error('Failed to approve task completion:', error);
    return false;
  }
}

/**
 * Reject task completion
 */
export async function rejectTaskCompletion(
  completionId: string,
  reviewedBy: number,
  reason: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    // Update completion status
    // UPDATE userTaskCompletions SET status = 'rejected', reviewedAt = NOW(), reviewedBy = ?, feedback = ? WHERE id = ?

    return true;
  } catch (error) {
    console.error('Failed to reject task completion:', error);
    return false;
  }
}

/**
 * Get task by ID
 */
async function getTaskById(taskId: string): Promise<MicroTask | null> {
  // Implement with database query
  return null;
}

/**
 * Get task completion by ID
 */
async function getTaskCompletionById(completionId: string): Promise<UserTaskCompletion | null> {
  // Implement with database query
  return null;
}

/**
 * Check if user has completed task
 */
async function hasUserCompletedTask(userId: number, taskId: string): Promise<boolean> {
  // Implement with database query
  return false;
}

/**
 * Get task statistics
 */
export async function getTaskStatistics(): Promise<{
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  totalRewards: number;
  averageRewardPerTask: number;
}> {
  const db = await getDb();
  if (!db) {
    return {
      totalTasks: 0,
      activeTasks: 0,
      completedTasks: 0,
      totalRewards: 0,
      averageRewardPerTask: 0,
    };
  }

  try {
    // Implement with database queries
    return {
      totalTasks: 0,
      activeTasks: 0,
      completedTasks: 0,
      totalRewards: 0,
      averageRewardPerTask: 0,
    };
  } catch (error) {
    console.error('Failed to get task statistics:', error);
    return {
      totalTasks: 0,
      activeTasks: 0,
      completedTasks: 0,
      totalRewards: 0,
      averageRewardPerTask: 0,
    };
  }
}

/**
 * Get tasks by category
 */
export async function getTasksByCategory(
  category: MicroTask['category'],
  limit: number = 50
): Promise<MicroTask[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    // Implement with database query
    // SELECT * FROM microTasks WHERE category = ? AND status = 'available' LIMIT ?

    return [];
  } catch (error) {
    console.error('Failed to get tasks by category:', error);
    return [];
  }
}

/**
 * Get recommended tasks for user
 */
export async function getRecommendedTasks(
  userId: number,
  limit: number = 10
): Promise<MicroTask[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    // Get user's completed tasks to understand preferences
    // Get tasks they haven't done yet
    // Recommend based on:
    // 1. Tasks they're most likely to complete (based on difficulty)
    // 2. Tasks with highest reward/time ratio
    // 3. Tasks expiring soon
    // 4. Tasks in categories they've done before

    return [];
  } catch (error) {
    console.error('Failed to get recommended tasks:', error);
    return [];
  }
}

/**
 * Create bulk tasks from template
 */
export async function createBulkTasksFromTemplate(
  template: keyof typeof TASK_TEMPLATES,
  count: number,
  customData?: Record<string, string>
): Promise<MicroTask[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const templateData = TASK_TEMPLATES[template];
    const tasks: MicroTask[] = [];

    for (let i = 0; i < count; i++) {
      let title = templateData.title;
      let description = templateData.description;

      // Replace placeholders
      if (customData) {
        Object.entries(customData).forEach(([key, value]) => {
          title = title.replace(`{{${key}}}`, value);
          description = description.replace(`{{${key}}}`, value);
        });
      }

      const task = await createTask(
        title,
        description,
        templateData.category,
        templateData.reward,
        templateData.estimatedTime,
        templateData.difficulty,
        1, // 1 slot per task
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Expires in 7 days
      );

      if (task) {
        tasks.push(task);
      }
    }

    return tasks;
  } catch (error) {
    console.error('Failed to create bulk tasks:', error);
    return [];
  }
}
