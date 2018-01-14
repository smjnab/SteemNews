////////////////////////////////////////////////////////////////////////////////////
/// Get news from steemit.
////////////////////////////////////////////////////////////////////////////////////

/// DSteem client for Steemit.com
const client = new dsteem.Client("https://api.steemit.com");

const pagePostFetchLimit = 25; /// Fetch 25 posts from blog. Fecthing 25 as not all might be news/blog posts.
const pagePostCountLimit = 5; /// How many posts for each news page.
const author = "Your Steemit User name";
const tagNews = "A tag you want to use as news."; /// I have a news tag, this selects them and indicates "News" on post.
const tagBlog = "Additional tag to use as news."; /// I have a blog tag, this selects them and indicates "Blog" on post.

var lastPost = "";  /// The perm link of last post. Used to load more news if wanted.
var loadNewsOnScroll = false;   ///Makes sure only one load new news triggers at last post.

/// When reaching last news post, load additional news.
$(window).scroll(function () {
    if (!loadNewsOnScroll) return;

    if ($(window).scrollTop() >= $(document).height() - $(window).height() - ($(document).height() / 5)) {
        loadNewsOnScroll = false;

        GetSteemDiscussions();
    }
});

/// Fetch news on first load.
GetSteemDiscussions();

/// Big pile of function for everything steem.
function GetSteemDiscussions() {

    var discussionQuery; /// Json with query for steem posts to get.

    /// Get post from start if first run, else resume from last.
    if (lastPost != "") discussionQuery = { start_author: author, start_permlink: lastPost, tag: author, limit: pagePostFetchLimit };
    else discussionQuery = { tag: author, limit: pagePostFetchLimit };

    /// Get blog posts from Steemit
    client.database.getDiscussions("blog", discussionQuery).then(function (discussions) {

        /// Style of the date of each post.
        var dateStyle = { year: "numeric", month: "long", day: "numeric" };
        var dateTimeFormat = new Intl.DateTimeFormat("en-EN", dateStyle);

        /// Count number of posts, used to limit news posts as fetching more incase blog has resteems etc.
        var postCount = 0;

        /// Remove loading when fetched news the first time.
        if (lastPost == "") $("#main .inner").html("<h1>Latest News &amp; Blog Posts</h1>");

        /// Go over fetched discussions and take the posts that matches what we want.
        var blogPosts = [];

        for (i = 0; i < discussions.length; i++) {
            blogPost = discussions[i];  ///Each blog post.
            metaTags = JSON.parse(discussions[i].json_metadata).tags; /// Each additional tag
            tagFound = false;

            /// Check main and additional tags for the tags we want.
            if (blogPost.category == tagNews || blogPost.category == tagBlog ||
                metaTags.indexOf(tagNews) >= 0 || metaTags.indexOf(tagBlog) >= 0)
                tagFound = true;

            /// Add post when tag found, new post and author correct
            if (tagFound && lastPost != blogPost.permlink && blogPost.author == author)
                blogPosts[i] = blogPost;
        }

        /// For each post, format the text properly.
        blogPosts.forEach(blogPost => {

            if (postCount < pagePostCountLimit) {

                /// Change the date format and remove time.
                var creationDate = dateTimeFormat.format(new Date(blogPost.created));

                /// Check body string
                var bodyString = DOMPurify.sanitize(blogPost.body, { SAFE_FOR_JQUERY: true });

                /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                /// Markup to HTML. (Stupid thing as obviously there are libs for this... did not think of it before doing it. Doh!)

                /// Convert new lines to html line breaks.
                bodyString = bodyString.replace(/\n/ig, "<br />");

                /// Remove weird "hr" from steepshot.
                bodyString = bodyString.replace(/[\- ]{10,40}/ig, "");

                /// Remove too many white lines from steepshot.
                bodyString = bodyString.replace(/<br \/><br \/><br \/><br \/>/ig, "<br \/>");

                /// Remove any center tags.
                bodyString = bodyString.replace(/<center>/ig, "");
                bodyString = bodyString.replace(/<\/center > /ig, "");

                /// Remove <hr>
                bodyString = bodyString.replace(/<hr>/ig, "");

                /// Steepshot specifics
                if (bodyString.indexOf("Created with Steepshot") >= 0) {

                    /// Remove created with steepshot section.
                    bodyString = bodyString.replace(
                        /!\[[a-zA-Z0-9_\-./]*\.(jpg|jpeg|png|svg|gif)\]\(https?:\/\/[a-zA-Z0-9_\-:;./!?&=+~@ <>)([\]]*Created with Steepshot[a-zA-Z0-9_\-:;./!?&=+~@ <>)([\]]*/ig,
                        ''
                    );

                    /// Make steepshot url for image into <img tag.
                    bodyString = bodyString.replace(
                        /(https?:\/\/steepshot[a-zA-Z0-9_\-:;./!?&=+~@]*\.(jpg|jpeg|png|svg|gif))/ig,
                        '<span class="image tweak"><img src="$1"  alt="" /></span>'
                    );
                }

                /// Add class to any <img tags.
                bodyString = bodyString.replace(
                    /<img src=('|")([a-zA-Z0-9_\-:;./!?&=+~ ]*)('|")>/ig,
                    '<span class="image tweak"><img src="$2"  alt="" /></span>'
                );

                /// Make Steemit image code into site specific tags.
                bodyString = bodyString.replace(
                    /\!\[[a-zA-Z0-9_\-./]*\.(jpg|jpeg|png|svg|gif)\]\((https?:\/\/[a-zA-Z0-9_\-:;./!?&=+~@]*)\)/ig,
                    '<span class="image tweak"><img src="$2"  alt="" /></span>'
                );

                /// Make Steemit url code into site specific tags.
                bodyString = bodyString.replace(
                    /\[([a-zA-Z -]*)\]\((https?:\/\/[a-zA-Z0-9_\-:;./!?&=+~@]*)\)/ig,
                    '<a href="$2" target="_blank">$1</a>'
                );

                /// Make urls written as text into url tags.
                bodyString = bodyString.replace(
                    /([^"'])(https?:\/\/[a-zA-Z0-9_\-:;./!?&=+~@]*)([^"']|$)/ig,
                    '$1<a href="$2" target="_blank">$2</a>$3'
                );

                /// Make @steem_username into links to steemit.com user blog
                bodyString = bodyString.replace(
                    /([^/])(@[a-z0-9-]{3,16})/ig,
                    '$1<a href="https://steemit.com/$2" target="_blank">$2</a>'
                );

                /// Make #taginto links to steemit.com tags
                bodyString = bodyString.replace(
                    /([^/])(#[a-z0-9-]{2,50})/ig,
                    '$1<a href="https://steemit.com/trending/$2" target="_blank">$2</a>'
                );

                /// Make ** into bold
                bodyString = bodyString.replace(
                    /(\*\*)(.*)(\*\*)/ig,
                    '<b>$2</b>'
                );

                /// Make #->##### into bold
                bodyString = bodyString.replace(
                    /(\#{1,5} )([a-zA-Z0-9_\-:;./!?&=+~ ]*)(<br \/>)/ig,
                    '<b>$2</b>$3'
                );

                /// Remove too much white lines after span.
                bodyString = bodyString.replace(/<\/span><br \/><br \/>/ig, "<\/span><br \/>");
                bodyString = bodyString.replace(/<\/span><br \/><br \/><br \/>/ig, "<\/span><br \/>");

                /// Indicate what type of post: news or blog.
                var blogType;
                if (blogPost.category == tagNews) blogType = "News"
                else blogType = "Blog"

                /// Check strings
                var postTitle = DOMPurify.sanitize(blogPost.title, { SAFE_FOR_JQUERY: true });
                var postURL = DOMPurify.sanitize(blogPost.url, { SAFE_FOR_JQUERY: true });

                /// Append each news post to the main inner div.
                $("#main .inner").append(
                    `<ul class="alt"><li><b>${postTitle}</b></li>
                            <li><sup><i>${blogType} published ${creationDate}</i></sup></li></ul>
                            <p class="news">${bodyString}
                                <p><i><a href="https://busy.org${postURL}" target="_blank">Comment on busy.org</a></i></p>
                            </p><br />`
                );

                postCount++;

                lastPost = blogPost.permlink;
            }
        });

        loadNewsOnScroll = true; /// Allow checking if reaching end of news to trigger fetch of more.
    });
}
