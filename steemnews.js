////////////////////////////////////////////////////////////////////////////////////
/// Get news from steemit.
////////////////////////////////////////////////////////////////////////////////////

/// DSteem client for Steemit.com
var client = new dsteem.Client("https://api.steemit.com", { timeout: 2000 });
const secondServer = "https://api.steemitstage.com/"; // If api.steemit.com does not respond, try this server.
const thirdServer = "https://gtg.steem.house:8090"; // If api.steemit.com does not respond, try this server.
const fourthServer = "https://rpc.steemliberator.com/"; // If api.steemit.com does not respond, try this server.

const pagePostFetchLimit = 25; /// Fetch 25 posts from blog. Fecthing 25 as not all might be news/blog posts.
const pagePostCountLimit = 5; /// How many posts for each news page.
const author = "Your Steemit User name";
const tagNews = "A tag you want to use as news."; /// I have a news tag, this selects them and indicates "News" on post.
const tagBlog = "Additional tag to use as news."; /// I have a blog tag, this selects them and indicates "Blog" on post.

var lastPost = "";  /// The perm link of last post. Used to load more news if wanted.
var loadNewsOnScroll = false;   /// Makes sure only one load new news triggers at last post.
var loadedFromScroll = false;   /// Check for knowing if posts has been loading from scrolling to bottom.

var postType = "";  ///Show blog & post or only one of them.
var failCount = 0;  /// Switch to secondary and third server on fails.

var steemResponse = ""; /// Saves the response from steemit until page reloaded.

/// On page load/reload always reset to news only.
$(document).ready(function () {

    $("#radioNewsNews").prop("checked", true);

    postType = "radioNewsNews";
});

/// Fetch news on first load.
GetSteemDiscussions(true);

/// When reaching last news post, load additional news.
$(window).scroll(function () {
    if (!loadNewsOnScroll) return;

    if ($(window).scrollTop() >= $(document).height() - $(window).height() - ($(document).height() / 5)) {
        loadNewsOnScroll = false;
        loadedFromScroll = true;

        GetSteemDiscussions(true);  /// Force fetch new posts from steemit as need new posts.
    }
});

/// Click on a radio button to select post types to show.
$(document).on("click", "#radioNewsBoth,#radioNewsNews,#radioNewsBlog", function (event) {

    postType = event.target.id; /// Use the id of button to set different post types.

    lastPost = "";  //Reset last post as changing type of posts to show.

    GetSteemDiscussions(loadedFromScroll);  /// If having scroll to bottom, force new query from steemit to get from start.
    loadedFromScroll = false;
});

/// Big pile of function for everything steem.
function GetSteemDiscussions(querySteemit) {

    var discussionQuery; /// Json with query for steem posts to get.

    /// Get post from start if first run, else resume from last.
    if (lastPost != "") discussionQuery = { start_author: author, start_permlink: lastPost, tag: author, limit: pagePostFetchLimit };
    else discussionQuery = { tag: author, limit: pagePostFetchLimit };

    /// Get blog posts from Steemit
    if (querySteemit) steemResponse = client.database.getDiscussions("blog", discussionQuery);

    steemResponse.then(function (discussions) {
        /// Style of the date of each post.
        var dateStyle = { year: "numeric", month: "long", day: "numeric" };
        var dateTimeFormat = new Intl.DateTimeFormat("en-EN", dateStyle);

        /// Count number of posts, used to limit news posts as fetching more incase blog has resteems etc.
        var postCount = 0;

        /// Remove loading.
        if (lastPost == "") $("#main .innerNews").html("");

        /// Go over fetched discussions and take the posts that matches what we want.
        var blogPosts = [];

        for (i = 0; i < discussions.length; i++) {
            blogPost = discussions[i];  ///Each blog post.

            var metaTags = JSON.parse(blogPost.json_metadata).tags; /// Each additional tag
            var tagFound = false;

            /// Check main and additional tags for the tags we want.
            if (postType == "radioNewsBoth" && (blogPost.category == tagNews || blogPost.category == tagBlog ||
                metaTags.indexOf(tagNews) >= 0 || metaTags.indexOf(tagBlog) >= 0))
                tagFound = true;

            /// Check main and additional tags for news only.
            else if (postType == "radioNewsNews" && (blogPost.category == tagNews || metaTags.indexOf(tagNews) >= 0))
                tagFound = true;

            /// Check main and additional tags for blog only.
            else if (postType == "radioNewsBlog" && (blogPost.category == tagBlog || metaTags.indexOf(tagBlog) >= 0))
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

                /// Convert markdown to html
                var converter = new showdown.Converter();

                converter.setOption("noHeaderId", "true");
                converter.setOption("simplifiedAutoLink", "true");
                converter.setOption("simpleLineBreaks", "true");
                converter.setOption("headerLevelStart", "1");
                converter.setOption("ghMentions", "true");
                converter.setOption("ghMentionsLink", "https://steemit.com/@{u}");

                // Steepshot specific.
                if (bodyString.indexOf("Steepshot") >= 0) {
                    /// Remove weird "hr" from steepshot.
                    bodyString = bodyString.replace(/[\- ]{10,40}/ig, "");

                    // Add line between Steepshot footer and comment.
                    bodyString += "<br /><br />";
                }

                bodyString = converter.makeHtml(bodyString);

                /// Change any h1 to h2
                bodyString = bodyString.replace(/<h1>/ig, "<h2>");
                bodyString = bodyString.replace(/<\/h1>/ig, "</h2>");

                /// Remove any <hr> tags.
                bodyString = bodyString.replace(/<hr>/ig, "");

                /// Make #taginto links to steemit.com tags
                bodyString = bodyString.replace(
                    /([^/])(#)([a-z0-9-]{2,50})/ig,
                    '$1<a href="https://steemit.com/trending/$3" target="_blank">$2$3</a>'
                );

                /// Add class to any <img tags.
                bodyString = bodyString.replace(
                    /<img src="([a-zA-Z0-9_\-:;./!?&=+~]*)" alt="([a-zA-Z0-9_\-:;./!?&=+~]*)" \/>/ig,
                    '<span class="image tweak"><img src="$1"  alt="$2" /></span>'
                );

                /// Make urls in text into a href
                bodyString = bodyString.replace(
                    /([^"])(https?:\/\/[a-zA-Z0-9.-]*[a-zA-Z0-9/_:@#~!?=&%*-]*)([^.!?]{0,1})/ig,
                    '$1<a href="$2">$2</a>$3'
                );

                /// Indicate what type of post: news or blog.
                var metaTags = JSON.parse(blogPost.json_metadata).tags;
                var blogType;

                if (blogPost.category == tagNews || metaTags.indexOf(tagNews) >= 0) blogType = "News"
                else blogType = "Blog"

                /// Check strings
                var postTitle = DOMPurify.sanitize(blogPost.title, { SAFE_FOR_JQUERY: true });
                var postURL = DOMPurify.sanitize(blogPost.url, { SAFE_FOR_JQUERY: true });

                /// Append each news post to the main inner div.
                $("#main .innerNews").append(
                    `<div class="newsHead"><ul class="alt"><li><h2 class="h2m">${postTitle}</h2></li>
                            <li><sup><i>${blogType} published ${creationDate}</i></sup></li></ul></div>
                            ${bodyString}
                                <p><i><a href="https://busy.org${postURL}" target="_blank">Comment on busy.org</a></i></p>
                            <p><br /></p>`
                );

                postCount++;

                lastPost = blogPost.permlink;
            }
        });

        if (blogPosts.length > 0) loadNewsOnScroll = true; /// Allow checking if reaching end of news to trigger fetch of more.

    }, function (error) {
        if (error.message.toLowerCase().includes("network") && failCount < 3) {
            /// Try again with second server.
            if (failCount === 0) {
                client = new dsteem.Client(secondServer, { timeout: 3000 });
            }

            /// Try again with third server.
            else if (failCount === 1) {
                client = new dsteem.Client(thirdServer, { timeout: 5000 });
            }

            /// Try again with fourth server.
            else if (failCount === 2) {
                client = new dsteem.Client(fourthServer, { timeout: 10000 });
            }

            GetSteemDiscussions(true); /// Force fetch new posts from steemit.

            failCount++;
        }
    });
}
