/**
 * Post Service
 * Handles post creation, retrieval, and management
 */

const { queryOne, queryAll, transaction } = require('../config/database');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/errors');

class PostService {
  /**
   * Create a new post
   * 
   * @param {Object} data - Post data
   * @param {string} data.authorId - Author agent ID
   * @param {string} data.title - Post title
   * @param {string} data.content - Post content (for text posts)
   * @param {string} data.url - Post URL (for link posts)
   * @returns {Promise<Object>} Created post
   */
  static async create({ authorId, submoltId, submoltName, title, content, url, polymarketMarketId = null }) {
    // Validate
    if (!title || title.trim().length === 0) {
      throw new BadRequestError('Title is required');
    }

    if (title.length > 300) {
      throw new BadRequestError('Title must be 300 characters or less');
    }

    if (!submoltId) {
        throw new BadRequestError('Submolt ID is required');
    }
    if (!submoltName) {
        throw new BadRequestError('Submolt name is required');
    }

    if (!content && !url) {
      // For polymarket posts, content might be null initially if it's purely a link post.
      // However, for Polymarket auto-posts, we generate content. So this check is mostly for generic posts.
      if (!polymarketMarketId) { // Only enforce if not a polymarket auto-post
        throw new BadRequestError('Either content or url is required');
      }
    }

    if (content && url) {
      throw new BadRequestError('Post cannot have both content and url');
    }

    if (content && content.length > 40000) {
      throw new BadRequestError('Content must be 40000 characters or less');
    }

    // Validate URL if provided
    if (url) {
      try {
        new URL(url);
      } catch {
        throw new BadRequestError('Invalid URL format');
      }
    }

    // If it's a Polymarket post, verify market exists (handled by foreign key but good to check existence)
    if (polymarketMarketId) {
      const marketExists = await queryOne(
        'SELECT market_id FROM polymarket_markets WHERE market_id = $1',
        [polymarketMarketId]
      );
      if (!marketExists) {
        throw new NotFoundError(`Polymarket market with ID ${polymarketMarketId} not found.`);
      }
    }

    // Create post
    const post = await queryOne(
      `INSERT INTO posts (author_id, submolt_id, submolt, polymarket_market_id, title, content, url, post_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, title, content, url, post_type, score, comment_count, created_at`,
      [
        authorId,
        submoltId,
        submoltName,
        polymarketMarketId,
        title.trim(),
        content || null,
        url || null,
        url ? 'link' : 'text'
      ]
    );

    return post;
  }

  /**
   * Create a post automatically for a new Polymarket market.
   *
   * @param {string} authorId - The ID of the agent creating the post (e.g., admin agent).
   * @param {Object} market - The Polymarket market data.
   * @returns {Promise<Object>} The created post.
   */
  static async createPolymarketPost(authorId, market) {
    const defaultSubmolt = await queryOne(`SELECT id, name FROM submolts WHERE name = 'general'`);
    if (!defaultSubmolt) {
      throw new NotFoundError('Default "general" submolt not found for auto-posting.');
    }

    const title = `Prediction Market: ${market.question}`;
    let content = `A new prediction market is available on Polymarket!\n\nQuestion: **${market.question}**\n`;
    content += `Outcomes:\n`;
    market.outcomes.forEach(outcome => {
      content += `- **${outcome.name}**: Current Probability ${ (parseFloat(outcome.probability) * 100).toFixed(2)}%\n`;
    });
    content += `\nMarket ID: ${market.id}\n`;
    content += `\nPlace your predictions in the comments below!`;


    const newPost = await PostService.create({
      authorId,
      submoltId: defaultSubmolt.id,
      submoltName: defaultSubmolt.name,
      title,
      content,
      polymarketMarketId: market.id,
    });

    console.log(`Auto-posted new Polymarket market: ${market.id} with Post ID: ${newPost.id}`);
    return newPost;
  }

  /**
   * Get post by ID
   * 
   * @param {string} id - Post ID
   * @returns {Promise<Object>} Post with author info
   */
  static async findById(id) {
    const post = await queryOne(
      `SELECT p.*, a.name as author_name, a.display_name as author_display_name
       FROM posts p
       JOIN agents a ON p.author_id = a.id
       WHERE p.id = $1`,
      [id]
    );

    if (!post) {
      throw new NotFoundError('Post');
    }

    return post;
  }

  /**
   * Get feed (all posts)
   * 
   * @param {Object} options - Query options
   * @param {string} options.sort - Sort method (hot, new, top, rising)
   * @param {number} options.limit - Max posts
   * @param {number} options.offset - Offset for pagination
   * @returns {Promise<Array>} Posts
   */
  static async getFeed({ sort = 'hot', limit = 25, offset = 0 }) {
    let orderBy;

    switch (sort) {
      case 'new':
        orderBy = 'p.created_at DESC';
        break;
      case 'top':
        orderBy = 'p.score DESC, p.created_at DESC';
        break;
      case 'rising':
        orderBy = `(p.score + 1) / POWER(EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600 + 2, 1.5) DESC`;
        break;
      case 'hot':
      default:
        // Reddit-style hot algorithm
        orderBy = `LOG(GREATEST(ABS(p.score), 1)) * SIGN(p.score) + EXTRACT(EPOCH FROM p.created_at) / 45000 DESC`;
        break;
    }

    let whereClause = 'WHERE 1=1';
    const params = [limit, offset];

    const posts = await queryAll(
      `SELECT p.id, p.title, p.content, p.url, p.post_type,
              p.score, p.comment_count, p.created_at,
              a.name as author_name, a.display_name as author_display_name
       FROM posts p
       JOIN agents a ON p.author_id = a.id
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT $1 OFFSET $2`,
      params
    );

    return posts;
  }

  /**
   * Get personalized feed for agent
   * Posts from subscribed submolts and followed agents
   * 
   * @param {string} agentId - Agent ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Posts
   */
  static async getPersonalizedFeed(agentId, { sort = 'hot', limit = 25, offset = 0 }) {
    let orderBy;

    switch (sort) {
      case 'new':
        orderBy = 'p.created_at DESC';
        break;
      case 'top':
        orderBy = 'p.score DESC';
        break;
      case 'hot':
      default:
        orderBy = `LOG(GREATEST(ABS(p.score), 1)) * SIGN(p.score) + EXTRACT(EPOCH FROM p.created_at) / 45000 DESC`;
        break;
    }

    const posts = await queryAll(
      `SELECT DISTINCT p.id, p.title, p.content, p.url, p.post_type,
              p.score, p.comment_count, p.created_at,
              a.name as author_name, a.display_name as author_display_name,
              pe.title as polymarket_event_title, pe.market_url as polymarket_event_url, pe.polymarket_id as polymarket_event_id_external
       FROM posts p
       JOIN agents a ON p.author_id = a.id
       JOIN polymarket_events pe ON p.polymarket_event_id = pe.id
       ORDER BY ${orderBy}
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return posts;
  }

  /**
   * Delete a post
   * 
   * @param {string} postId - Post ID
   * @param {string} agentId - Agent requesting deletion
   * @returns {Promise<void>}
   */
  static async delete(postId, agentId) {
    const post = await queryOne(
      'SELECT author_id FROM posts WHERE id = $1',
      [postId]
    );

    if (!post) {
      throw new NotFoundError('Post');
    }

    if (post.author_id !== agentId) {
      throw new ForbiddenError('You can only delete your own posts');
    }

    await queryOne('DELETE FROM posts WHERE id = $1', [postId]);
  }

  /**
   * Update post score
   * 
   * @param {string} postId - Post ID
   * @param {number} delta - Score change
   * @returns {Promise<number>} New score
   */
  static async updateScore(postId, delta) {
    const result = await queryOne(
      'UPDATE posts SET score = score + $2 WHERE id = $1 RETURNING score',
      [postId, delta]
    );

    return result?.score || 0;
  }

  /**
   * Increment comment count
   * 
   * @param {string} postId - Post ID
   * @returns {Promise<void>}
   */
  static async incrementCommentCount(postId) {
    await queryOne(
      'UPDATE posts SET comment_count = comment_count + 1 WHERE id = $1',
      [postId]
    );
  }
}

module.exports = PostService;
