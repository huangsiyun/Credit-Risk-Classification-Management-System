// 设置 Axios 默认配置
axios.defaults.baseURL = '/LumeBlog';
axios.defaults.headers.post['Content-Type'] = 'application/json';

// 添加请求拦截器，携带 token
axios.interceptors.request.use(config => {
    const userStr = sessionStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            if (user.token) {
                config.headers.common['Authorization'] = user.token;
            }
        } catch (e) {
            console.error('解析用户信息失败:', e);
        }
    }
    return config;
});

// Vue 应用
const app = new Vue({
    el: document.getElementById('user-actions') ? '#user-actions' : undefined,
    data: {
        isLoggedIn: false,
        currentUser: {}
    },
    mounted() {
        if (this.$el) {
            this.checkLoginStatus();
        }
    },
    methods: {
        checkLoginStatus() {
            const userStr = sessionStorage.getItem('user');
            if (userStr) {
                try {
                    console.log('SessionStorage raw data:', userStr);
                    const userData = JSON.parse(userStr);
                    // 后端返回的格式是 {user: {...}, token: '...'}
                    // 我们需要提取 user 对象
                    this.currentUser = userData.user || userData;
                    console.log('Parsed currentUser:', this.currentUser);
                    this.isLoggedIn = true;
                } catch (e) {
                    console.error('Failed to parse user data:', e);
                    sessionStorage.removeItem('user');
                    this.isLoggedIn = false;
                }
            } else {
                console.log('No user data in sessionStorage');
            }
        },
        logout() {
            sessionStorage.removeItem('user');
            this.isLoggedIn = false;
            this.currentUser = {};
            articleApp.checkLoginStatus();
        },
        checkLoginBeforeNavigate(url) {
            if (!this.isLoggedIn) {
                alert('请先登录哦');
                return;
            }
            window.location.href = url;
        }
    }
});

// 文章列表组件
const articleApp = new Vue({
    el: document.getElementById('article-list') ? '#article-list' : undefined,
    data: {
        articles: [],
        categories: [],
        currentPageNum: 1,
        pageSize: 5,
        totalPages: 1,
        currentPage: 'list',
        selectedCategory: null,
        isLoggedIn: false,
        currentUser: {},
        searchTitle: '',
        searchAuthor: '',
        searchKeyword: ''
    },
    mounted() {
        if (this.$el) {
            this.checkLoginStatus();
            this.loadCategories();
            this.loadArticles();
        }
    },
    methods: {
        checkLoginStatus() {
            const userStr = sessionStorage.getItem('user');
            if (userStr) {
                try {
                    console.log('ArticleApp - SessionStorage raw data:', userStr);
                    const userData = JSON.parse(userStr);
                    // 后端返回的格式是 {user: {...}, token: '...'}
                    // 我们需要提取 user 对象
                    this.currentUser = userData.user || userData;
                    console.log('ArticleApp - Parsed currentUser:', this.currentUser);
                    this.isLoggedIn = true;
                } catch (e) {
                    console.error('ArticleApp - Failed to parse user data:', e);
                    sessionStorage.removeItem('user');
                    this.isLoggedIn = false;
                    this.currentUser = {};
                }
            } else {
                console.log('ArticleApp - No user data in sessionStorage');
                this.isLoggedIn = false;
                this.currentUser = {};
            }
        },
        loadCategories() {
            axios.get('/api/categories')
                .then(response => {
                    if (response.data.code === 200) {
                        this.categories = response.data.data;
                    }
                })
                .catch(error => {
                    console.error('Load categories error:', error);
                });
        },
        loadArticles() {
            const articleListElement = document.getElementById('article-list');
            const articleDetailElement = document.getElementById('article-detail');
            if (articleListElement) articleListElement.style.display = 'block';
            if (articleDetailElement) articleDetailElement.style.display = 'none';
            
            let url = `/api/articles?pageNum=${this.currentPageNum}&pageSize=${this.pageSize}`;
            if (this.selectedCategory) {
                url += `&categoryId=${this.selectedCategory}`;
            }
            if (this.searchTitle) {
                url += `&title=${encodeURIComponent(this.searchTitle)}`;
            }
            if (this.searchAuthor) {
                url += `&author=${encodeURIComponent(this.searchAuthor)}`;
            }
            if (this.searchKeyword) {
                url += `&keyword=${encodeURIComponent(this.searchKeyword)}`;
            }
            console.log('Loading articles with URL:', url);
            console.log('Current page:', this.currentPageNum, '/', this.totalPages);
            
            axios.get(url)
                .then(response => {
                    console.log('API Response:', response.data);
                    if (response.data.code === 200) {
                        console.log('Articles data:', response.data.data.list);
                        this.articles = response.data.data.list;
                        this.totalPages = response.data.data.pages;
                        this.currentPageNum = response.data.data.pageNum;
                        console.log('Articles array:', this.articles);
                        console.log('Updated pagination:', this.currentPageNum, '/', this.totalPages);
                    }
                })
                .catch(error => {
                    console.error('Load articles error:', error);
                    console.error('Error details:', error.response ? error.response.data : error.message);
                });
        },
        searchArticles() {
            this.currentPageNum = 1;
            this.loadArticles();
        },
        resetSearch() {
            this.searchTitle = '';
            this.searchAuthor = '';
            this.searchKeyword = '';
            this.selectedCategory = null;
            this.currentPageNum = 1;
            this.loadArticles();
        },
        viewArticle(articleId) {
            window.location.href = `views/article-detail.html?id=${articleId}`;
        },
        prevPage() {
            if (this.currentPageNum > 1) {
                this.currentPageNum--;
                this.loadArticles();
            }
        },
        nextPage() {
            if (this.currentPageNum < this.totalPages) {
                this.currentPageNum++;
                this.loadArticles();
            }
        },
        filterByCategory(categoryId) {
            this.selectedCategory = categoryId;
            this.currentPageNum = 1;
            this.loadArticles();
        },
        isAuthor(article) {
            return this.isLoggedIn && (article.user && this.currentUser.id === article.user.id || this.currentUser.role === 'admin');
        },
        editArticle(article) {
            window.location.href = `views/article-edit.html?id=${article.id}`;
        },
        deleteArticle(articleId) {
            if (confirm('确定要删除这篇文章吗？')) {
                axios.delete(`/api/articles/${articleId}`)
                    .then(response => {
                        if (response.data.code === 200) {
                            this.loadArticles();
                        } else {
                            alert(response.data.message || '删除失败');
                        }
                    })
                    .catch(error => {
                        alert('删除失败，请稍后重试');
                        console.error('Delete article error:', error);
                    });
            }
        },
        toggleLike(article) {
            if (!this.isLoggedIn) {
                alert('请先登录');
                return;
            }
            
            axios.post('/api/likes/toggle', {
                articleId: article.id
            })
            .then(response => {
                if (response.data.code === 200) {
                    article.isLiked = response.data.data.isLiked;
                    article.likeCount = response.data.data.likeCount;
                } else {
                    alert(response.data.message || '点赞失败');
                }
            })
            .catch(error => {
                console.error('点赞操作失败:', error);
                alert('点赞操作失败，请稍后重试');
            });
        },
        formatDate(date) {
            if (!date) return '';
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hour = String(d.getHours()).padStart(2, '0');
            const minute = String(d.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day} ${hour}:${minute}`;
        }
    }
});

// 文章详情组件
const detailApp = new Vue({
    el: document.getElementById('article-detail') ? '#article-detail' : undefined,
    data: {
        currentArticle: {
            title: '',
            content: '',
            user: {},
            category: {},
            viewCount: 0,
            createTime: ''
        },
        comments: [],
        newComment: {
            content: ''
        },
        likeCount: 0,
        isLiked: false,
        isLoggedIn: false,
        currentUser: {},
        relatedArticles: []
    },
    mounted() {
        if (this.$el) {
            this.checkLoginStatus();
            const hash = window.location.hash;
            if (hash.startsWith('#article=')) {
                const articleId = hash.split('=')[1];
                this.loadArticleDetail(articleId);
            }
        }
    },
    methods: {
        checkLoginStatus() {
            const userStr = sessionStorage.getItem('user');
            if (userStr) {
                try {
                    const userData = JSON.parse(userStr);
                    // 后端返回的格式是 {user: {...}, token: '...'}
                    // 我们需要提取 user 对象
                    this.currentUser = userData.user || userData;
                    this.isLoggedIn = true;
                } catch (e) {
                    this.isLoggedIn = false;
                }
            } else {
                this.isLoggedIn = false;
            }
        },
        loadArticleDetail(articleId) {
            const articleListElement = document.getElementById('article-list');
            const articleDetailElement = document.getElementById('article-detail');
            if (articleListElement) articleListElement.style.display = 'none';
            if (articleDetailElement) articleDetailElement.style.display = 'block';
            
            axios.get(`/api/articles/${articleId}`)
                .then(response => {
                    if (response.data.code === 200) {
                        this.currentArticle = response.data.data;
                        this.currentArticle.likeCount = this.currentArticle.likeCount || 0;
                        this.currentArticle.isLiked = this.currentArticle.isLiked || false;
                        this.loadComments(articleId);
                    } else {
                        alert(response.data.message || '加载文章失败');
                    }
                })
                .catch(error => {
                    console.error('Load article detail error:', error);
                });
        },
        loadComments(articleId) {
            axios.get(`/api/comments/article/${articleId}`)
                .then(response => {
                    if (response.data.code === 200) {
                        this.comments = response.data.data;
                    }
                })
                .catch(error => {
                    console.error('Load comments error:', error);
                });
        },
        submitComment() {
            if (!this.isLoggedIn) {
                alert('请先登录哦');
                return;
            }
            
            if (!this.newComment.content.trim()) {
                alert('评论内容不能为空');
                return;
            }
            
            const commentData = {
                articleId: this.currentArticle.id,
                content: this.newComment.content
            };
            
            axios.post('/api/comments', commentData)
                .then(response => {
                    if (response.data.code === 200) {
                        this.loadComments(this.currentArticle.id);
                        this.newComment.content = '';
                    } else {
                        alert(response.data.message || '评论失败');
                    }
                })
                .catch(error => {
                    alert('评论失败，请稍后重试');
                    console.error('Submit comment error:', error);
                });
        },
        toggleLike() {
            if (!this.isLoggedIn) {
                alert('请先登录哦');
                return;
            }
            
            axios.post('/api/likes/toggle', {
                articleId: this.currentArticle.id
            })
            .then(response => {
                if (response.data.code === 200) {
                    this.currentArticle.isLiked = response.data.data.isLiked;
                    this.currentArticle.likeCount = response.data.data.likeCount;
                } else {
                    alert(response.data.message || '操作失败');
                }
            })
            .catch(error => {
                console.error('点赞操作失败:', error);
                alert('操作失败，请稍后重试');
            });
        },
        deleteComment(commentId) {
            if (confirm('确定要删除这条评论吗？')) {
                axios.delete(`/api/comments/${commentId}`)
                    .then(response => {
                        if (response.data.code === 200) {
                            this.loadComments(this.currentArticle.id);
                        } else {
                            alert(response.data.message || '删除失败');
                        }
                    })
                    .catch(error => {
                        alert('删除失败，请稍后重试');
                        console.error('Delete comment error:', error);
                    });
            }
        },
        isCommentAuthor(comment) {
            return this.isLoggedIn && (comment.user && this.currentUser.id === comment.user.id || this.currentUser.role === 'admin');
        },
        backToList() {
            window.location.hash = '';
            const articleDetailElement = document.getElementById('article-detail');
            const articleListElement = document.getElementById('article-list');
            if (articleDetailElement) articleDetailElement.style.display = 'none';
            if (articleListElement) articleListElement.style.display = 'block';
            if (articleApp) {
                articleApp.currentPage = 'list';
                articleApp.loadArticles();
            }
        },
        formatDate(dateStr) {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            return date.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }
});

const initialDetailElement = document.getElementById('article-detail');
if (initialDetailElement) initialDetailElement.style.display = 'none';
