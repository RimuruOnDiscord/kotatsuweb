import okhttp3.OkHttpClient
import okhttp3.CookieJar
import org.koitharu.kotatsu.parsers.MangaLoaderContext
import org.koitharu.kotatsu.parsers.MangaSourceConfig
import org.koitharu.kotatsu.parsers.MangaParserSource

class WebMangaContext : MangaLoaderContext {
    override val httpClient: OkHttpClient = OkHttpClient.Builder().build()
    override val cookieJar: CookieJar = CookieJar.NO_COOKIES
    
    // Just returns a default config for every source
    override fun getParserConfig(source: MangaParserSource): MangaSourceConfig {
        return object : MangaSourceConfig {}
    }
}